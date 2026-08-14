import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 120;

// Inbound-email → events. An event newsletter (San Miguel Live!, AllEvents, etc.)
// forwarded to this webhook gets parsed by Claude into real, future-dated events and
// published. Fully automatic: no clicks, and it reaches sources that scraping can't
// (Cloudflare-walled sites, subscriber-only lists).
//
// Auth: append ?token=INGEST_SECRET (email/forwarding services can't send a password).
// Body: accepts JSON or form-encoded {subject, from, text, html} — the common shape
// used by Cloudflare Email Routing workers and inbound-parse services (Mailgun, etc.).

const CATS = ["musica", "cine", "tours", "comunidad", "charlas", "mercados", "bienestar"];

function htmlToText(s) {
  return String(s || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function readBody(req) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await req.json().catch(() => ({}));
  if (ct.includes("form")) {
    const fd = await req.formData().catch(() => null);
    if (!fd) return {};
    const o = {};
    for (const [k, v] of fd.entries()) o[k] = typeof v === "string" ? v : "";
    return o;
  }
  // Fallback: raw text becomes the body text.
  const raw = await req.text().catch(() => "");
  return { text: raw };
}

async function extract(anthropic, text, subject, todayStr) {
  const prompt = `Today is ${todayStr}. Below is the text of an email newsletter about events in San Miguel de Allende (Mexico), subject "${subject || ""}". Extract only REAL events with a clear future date (today through ~16 weeks out). Never include events dated before ${todayStr}. Do NOT invent anything. Return ONLY a JSON array (no prose). Each item:
{"title_en": string, "title_es": string|null, "blurb_en": string, "category": one of ${JSON.stringify(CATS)}, "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"|null, "start_time": "HH:MM"|null, "recurring": boolean, "venue": string|null, "area": string|null, "price_en": string|null}
If there are no datable future events, return [].

EMAIL TEXT:
${text}`;
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3500,
    messages: [{ role: "user", content: prompt }],
  });
  const raw = (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("");
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try { return JSON.parse(m[0]); } catch { return []; }
}

async function handle(req) {
  const token = new URL(req.url).searchParams.get("token");
  if (!process.env.INGEST_SECRET || token !== process.env.INGEST_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const body = await readBody(req);
  const subject = body.subject || body.Subject || "";
  const text = htmlToText(body.text || body["body-plain"] || body.html || body.Html || "").slice(0, 40000);
  if (!text) return Response.json({ ok: true, added: 0, note: "Empty email." });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sb = supabaseAdmin();
  const todayStr = new Date().toLocaleDateString("en-CA");

  let events = [];
  try { events = await extract(anthropic, text, subject, todayStr); } catch (e) { return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 }); }

  const { data: existing } = await sb.from("events").select("title_en,start_date");
  const have = new Set((existing || []).map((e) => `${(e.title_en || "").toLowerCase()}|${e.start_date || ""}`));

  const rows = [];
  let found = 0;
  for (const e of Array.isArray(events) ? events : []) {
    if (!e || !e.title_en || !CATS.includes(e.category)) continue;
    if (!e.recurring && !/^\d{4}-\d{2}-\d{2}$/.test(e.start_date || "")) continue;
    if (!e.recurring) {
      const last = (e.end_date && /^\d{4}-\d{2}-\d{2}$/.test(e.end_date)) ? e.end_date : e.start_date;
      if (last < todayStr) continue;
    }
    found++;
    const key = `${e.title_en.toLowerCase()}|${e.start_date || ""}`;
    if (have.has(key)) continue;
    have.add(key);
    rows.push({
      status: "published",
      title_en: e.title_en, title_es: e.title_es || null,
      blurb_en: e.blurb_en || null, blurb_es: null,
      price_en: e.price_en || null, price_es: null,
      category: e.category, audience: [],
      start_date: e.start_date || null, end_date: e.end_date || e.start_date || null, start_time: e.start_time || null,
      recurring: !!e.recurring, venue: e.venue || null, area: e.area || null,
      origin_name: "Newsletter", origin_url: null, discovered_via: "email", photo_url: null, lat: null, lng: null,
    });
  }

  let added = 0, error = null;
  if (rows.length) {
    const { data, error: er } = await sb.from("events").insert(rows).select("id");
    if (er) error = er.message; else added = data.length;
  }
  return Response.json({ ok: !error, found, added, skipped: found - added, error }, { status: error ? 500 : 200 });
}

export async function POST(req) { return handle(req); }
