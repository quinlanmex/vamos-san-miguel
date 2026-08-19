import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { getGoogleToken } from "../../../lib/google";
import { cleanDays } from "../discover-events/route";

export const runtime = "nodejs";
export const maxDuration = 300;

// Read event newsletters from a shared Workspace inbox and turn them into events.
// The service account impersonates NEWSLETTER_INBOX (e.g. events@expatstack.com) via
// domain-wide delegation, reads unread messages, Claude extracts future-dated events,
// they publish (deduped), and the message is marked read. Fully automatic (daily cron).
//
// Setup: create the inbox in Workspace, enable the Gmail API, authorize the service
// account for scope https://www.googleapis.com/auth/gmail.modify in Admin console
// (Security → API controls → Domain-wide delegation), set env NEWSLETTER_INBOX, and
// subscribe that inbox to the newsletters.

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const SCOPE = "https://www.googleapis.com/auth/gmail.modify";
const CATS = ["musica", "cine", "tours", "comunidad", "charlas", "mercados", "bienestar"];

function b64urlDecode(s) {
  try { return Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"); }
  catch { return ""; }
}
function htmlToText(s) {
  return String(s || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}
// Pull readable text out of a Gmail message payload (prefer text/plain).
function bodyText(payload) {
  if (!payload) return "";
  const walk = (p, want) => {
    if (!p) return "";
    if (p.mimeType === want && p.body && p.body.data) return b64urlDecode(p.body.data);
    for (const part of p.parts || []) { const r = walk(part, want); if (r) return r; }
    return "";
  };
  const plain = walk(payload, "text/plain");
  if (plain) return plain;
  return htmlToText(walk(payload, "text/html"));
}

async function gapi(path, token, init) {
  const r = await fetch(`${GMAIL}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...((init && init.headers) || {}) } });
  return r;
}

async function extract(anthropic, text, subject, todayStr) {
  const prompt = `Today is ${todayStr}. Below is an email newsletter about San Miguel de Allende (Mexico) events, subject "${subject || ""}". Extract only REAL events with a clear future date (today through ~16 weeks). Never include events before ${todayStr}. Do NOT invent anything. Return ONLY a JSON array. Each item:
Provide BOTH English and natural Mexican-Spanish for the title and blurb.
For "recur_days" (recurring events only): the weekdays it repeats on as integers 0=Sunday..6=Saturday (e.g. "every Tuesday" -> [2], "weekends" -> [0,6], "daily" -> [0,1,2,3,4,5,6]); null if not recurring or the days are not stated. Do NOT guess from a single sample date.
For "recur_note"/"recur_note_es" (recurring only): a SHORT human-readable schedule as stated, in English and Mexican Spanish (e.g. "Every Wednesday"/"Cada miércoles", "1st Sunday of the month"/"1er domingo del mes", "Daily"/"Diario"); null if not recurring or not stated.
{"title_en": string, "title_es": string, "blurb_en": string, "blurb_es": string, "category": one of ${JSON.stringify(CATS)}, "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"|null, "start_time": "HH:MM"|null, "recurring": boolean, "recur_days": array of integers 0-6 | null, "recur_note": string|null, "recur_note_es": string|null, "venue": string|null, "area": string|null, "price_en": string|null, "price_es": string|null}
If none, return [].

EMAIL:
${text}`;
  const msg = await anthropic.messages.create({ model: "claude-haiku-4-5-20251001", max_tokens: 3500, messages: [{ role: "user", content: prompt }] });
  const raw = (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("");
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try { return JSON.parse(m[0]); } catch { return []; }
}

export async function run() {
  const inbox = process.env.NEWSLETTER_INBOX;
  if (!inbox) return { ok: false, error: "NEWSLETTER_INBOX not configured", status: 500 };
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "ANTHROPIC_API_KEY not configured", status: 500 };

  let token;
  try { token = await getGoogleToken(SCOPE, inbox); }
  catch (e) { return { ok: false, error: "Gmail auth failed (domain-wide delegation set up?): " + String(e.message || e), status: 500 }; }

  // Unread, recent messages only.
  const listRes = await gapi("/messages?q=" + encodeURIComponent("is:unread newer_than:21d") + "&maxResults=25", token);
  if (!listRes.ok) { const b = await listRes.text().catch(() => ""); return { ok: false, error: `Gmail list ${listRes.status}: ${b.slice(0, 200)}`, status: 500 }; }
  const list = await listRes.json();
  const ids = (list.messages || []).map((m) => m.id);
  if (!ids.length) return { ok: true, processed: 0, added: 0, note: "No unread newsletters." };

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sb = supabaseAdmin();
  const todayStr = new Date().toLocaleDateString("en-CA");
  const { data: existing } = await sb.from("events").select("title_en,start_date");
  const have = new Set((existing || []).map((e) => `${(e.title_en || "").toLowerCase()}|${e.start_date || ""}`));

  let processed = 0, added = 0;
  const rows = [];
  for (const id of ids) {
    const mRes = await gapi(`/messages/${id}?format=full`, token);
    if (!mRes.ok) continue;
    const msg = await mRes.json();
    const subject = (msg.payload?.headers || []).find((h) => h.name.toLowerCase() === "subject")?.value || "";
    const text = bodyText(msg.payload).slice(0, 40000);
    processed++;
    let events = [];
    if (text) { try { events = await extract(anthropic, text, subject, todayStr); } catch { events = []; } }
    for (const e of Array.isArray(events) ? events : []) {
      if (!e || !e.title_en || !CATS.includes(e.category)) continue;
      if (!e.recurring && !/^\d{4}-\d{2}-\d{2}$/.test(e.start_date || "")) continue;
      if (!e.recurring) { const last = (e.end_date && /^\d{4}-\d{2}-\d{2}$/.test(e.end_date)) ? e.end_date : e.start_date; if (last < todayStr) continue; }
      const key = `${e.title_en.toLowerCase()}|${e.start_date || ""}`;
      if (have.has(key)) continue;
      have.add(key);
      rows.push({
        status: "published", title_en: e.title_en, title_es: e.title_es || null,
        blurb_en: e.blurb_en || null, blurb_es: e.blurb_es || null, price_en: e.price_en || null, price_es: e.price_es || null,
        category: e.category, audience: [], start_date: e.start_date || null,
        end_date: e.end_date || e.start_date || null, start_time: e.start_time || null,
        recurring: !!e.recurring, recur_days: e.recurring ? cleanDays(e.recur_days) : null,
        recur_note: e.recurring && typeof e.recur_note === "string" && e.recur_note.trim() ? e.recur_note.trim().slice(0, 80) : null,
        recur_note_es: e.recurring && typeof e.recur_note_es === "string" && e.recur_note_es.trim() ? e.recur_note_es.trim().slice(0, 80) : null,
        venue: e.venue || null, area: e.area || null,
        origin_name: "Newsletter", origin_url: null, discovered_via: "newsletter", photo_url: null, lat: null, lng: null,
      });
    }
    // Mark read so we don't reprocess it.
    await gapi(`/messages/${id}/modify`, token, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ removeLabelIds: ["UNREAD"] }) });
  }

  let error = null;
  if (rows.length) {
    let { data, error: er } = await sb.from("events").insert(rows).select("id");
    if (er && /recur_days|recur_note/.test(er.message || "")) {
      const stripped = rows.map(({ recur_days, recur_note, recur_note_es, ...r }) => r);
      ({ data, error: er } = await sb.from("events").insert(stripped).select("id"));
    }
    if (er) error = er.message; else added = data.length;
  }
  return { ok: !error, processed, added, error };
}

export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  const secret = process.env.CRON_SECRET;
  const isCron = req.headers.get("x-vercel-cron") === "1";
  if (!isCron && !(secret && token === secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.status || (r.ok ? 200 : 500) });
}

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.status || (r.ok ? 200 : 500) });
}
