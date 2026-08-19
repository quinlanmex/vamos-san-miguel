import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 120;

// Public San Miguel event sources to scan (static-HTML listings). Add more over time.
// Note: many local sources (Biblioteca taquilla, Facebook, Eventbrite) are JS-rendered
// and can't be scraped this way — those still come in via the admin paste-to-publish flow.
const SOURCES = [
  "https://discoversma.com/events/",
  "https://discoversma.com/events/list/",
  "https://discoversma.com/events/month/",
  "https://labibliotecapublica.org/taquilla/",
  "https://mexiconewsdaily.com/events/san-miguel-de-allende/",
];
const CATS = ["musica", "cine", "tours", "comunidad", "charlas", "mercados", "bienestar"];

// Normalize a recurrence-days array to unique, sorted integers 0-6; null if none/invalid.
export function cleanDays(a) {
  if (!Array.isArray(a)) return null;
  const days = [...new Set(a.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort((x, y) => x - y);
  return days.length ? days : null;
}

async function fetchText(url) {
  try {
    // Browser-like headers — many event sites' firewalls 406/block a plain bot UA.
    const r = await fetch(url, { headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9,es;q=0.8",
    } });
    if (!r.ok) return null;
    const html = await r.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 45000);
  } catch { return null; }
}

async function extract(anthropic, text, source, todayStr) {
  const prompt = `Today is ${todayStr}. Below is the visible text of a San Miguel de Allende (Mexico) events page (an aggregator). Extract only REAL upcoming events that have a clear future date on this page (from today through the next ~16 weeks). Never include events dated before ${todayStr}. Do NOT invent anything.

IMPORTANT:
- Write the "blurb_en" in your OWN words as a short original description. Do NOT copy sentences from the page.
- For "source_name" and "source_url", identify the event's ORIGINAL source — the organizer, venue, presenter, or ticket/organizer link listed for the event. Do NOT use the aggregator itself (never "Mexico News Daily", "AllEvents", etc.) as the source. If no original source is shown, use null.

For "recur_days": if the event is recurring, list the weekdays it repeats on as an array of integers (0=Sunday, 1=Monday, ... 6=Saturday). Examples: "every Tuesday" -> [2]; "Saturdays and Sundays" -> [0,6]; "daily" or "every day" -> [0,1,2,3,4,5,6]. If the event is not recurring, or the days are not stated, use null. Do NOT guess a day from a single sample date.

Provide BOTH English and natural Mexican-Spanish for the title and blurb.
Return ONLY a JSON array (no prose). Each item:
{"title_en": string, "title_es": string, "blurb_en": string, "blurb_es": string, "category": one of ${JSON.stringify(CATS)}, "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"|null, "start_time": "HH:MM"|null, "recurring": boolean, "recur_days": array of integers 0-6 | null, "venue": string|null, "area": string|null, "price_en": string|null, "price_es": string|null, "source_name": string|null, "source_url": string|null}
If there are no datable events, return [].

PAGE TEXT:
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

export async function run() {
  if (!process.env.ANTHROPIC_API_KEY) return { error: "ANTHROPIC_API_KEY not configured", status: 500 };
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sb = supabaseAdmin();
  const todayStr = new Date().toLocaleDateString("en-CA");

  // Normalized title (fold accents + punctuation) so "Tianguis de los Martes",
  // "Tianguis de los Martes / Tuesday Market", etc. all collapse to one key and we
  // never insert punctuation-only duplicates. Recurring events dedupe on title alone.
  const nt = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const dkey = (title, date, recurring) => (recurring ? `${nt(title)}|recurring` : `${nt(title)}|${date || ""}`);
  const { data: existing } = await sb.from("events").select("title_en,start_date,recurring");
  const have = new Set((existing || []).map((e) => dkey(e.title_en, e.start_date, e.recurring)));

  let found = 0;
  const rows = [];
  for (const source of SOURCES) {
    const text = await fetchText(source);
    if (!text) continue;
    let events = [];
    try { events = await extract(anthropic, text, source, todayStr); } catch { continue; }
    for (const e of Array.isArray(events) ? events : []) {
      if (!e || !e.title_en || !CATS.includes(e.category)) continue;
      if (!e.recurring && !/^\d{4}-\d{2}-\d{2}$/.test(e.start_date || "")) continue;
      // Never store an event that has already ended.
      if (!e.recurring) {
        const last = (e.end_date && /^\d{4}-\d{2}-\d{2}$/.test(e.end_date)) ? e.end_date : e.start_date;
        if (last < todayStr) continue;
      }
      found++;
      const key = dkey(e.title_en, e.start_date, e.recurring);
      if (have.has(key)) continue;
      have.add(key);
      rows.push({
        status: "published",
        title_en: e.title_en, title_es: e.title_es || null,
        blurb_en: e.blurb_en || null, blurb_es: e.blurb_es || null,
        price_en: e.price_en || null, price_es: e.price_es || null,
        category: e.category, audience: [],
        start_date: e.start_date || null, end_date: e.end_date || e.start_date || null, start_time: e.start_time || null,
        recurring: !!e.recurring, recur_days: e.recurring ? cleanDays(e.recur_days) : null, venue: e.venue || null, area: e.area || null,
        // Attribute to the event's ORIGINAL organizer/venue (never the aggregator we scraped).
        // The aggregator host is kept only internally in discovered_via, not shown publicly.
        origin_name: e.source_name || e.venue || null,
        origin_url: (e.source_url && /^https?:\/\//.test(e.source_url)) ? e.source_url : null,
        discovered_via: (() => { try { return "auto:" + new URL(source).hostname; } catch { return "auto-discover"; } })(),
        photo_url: null, lat: null, lng: null,
      });
    }
  }

  let added = 0, error = null;
  if (rows.length) {
    let { data, error: e } = await sb.from("events").insert(rows).select("id");
    // Tolerate the recur_days column not existing yet (before the one-time migration is run).
    if (e && /recur_days/.test(e.message || "")) {
      const stripped = rows.map(({ recur_days, ...r }) => r);
      ({ data, error: e } = await sb.from("events").insert(stripped).select("id"));
    }
    if (e) error = e.message; else added = data.length;
  }
  return { ok: !error, found, added, skipped: found - added, error };
}

// Scheduled (Vercel cron) — protected by x-vercel-cron or a token.
export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  const secret = process.env.CRON_SECRET;
  const isCron = req.headers.get("x-vercel-cron") === "1";
  if (!isCron && !(secret && token === secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.status || (r.error ? 500 : 200) });
}

// Manual trigger from admin.
export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.status || (r.error ? 500 : 200) });
}
