import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 120;

// Public San Miguel event sources to scan. Add more over time.
const SOURCES = [
  "https://discoversma.com/events/events/",
];
const CATS = ["musica", "cine", "tours", "comunidad", "charlas", "mercados", "bienestar"];

async function fetchText(url) {
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; VamosBot/1.0)" } });
    if (!r.ok) return null;
    const html = await r.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 24000);
  } catch { return null; }
}

async function extract(anthropic, text, source, todayStr) {
  const prompt = `Today is ${todayStr}. Below is the visible text of a San Miguel de Allende (Mexico) events page. Extract only REAL upcoming events that have a clear date on this page (within the next ~8 weeks). Do NOT invent anything. Return ONLY a JSON array (no prose). Each item:
{"title_en": string, "title_es": string|null, "blurb_en": string, "category": one of ${JSON.stringify(CATS)}, "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"|null, "start_time": "HH:MM"|null, "recurring": boolean, "venue": string|null, "area": string|null, "price_en": string|null}
If there are no datable events, return []. Source: ${source}

PAGE TEXT:
${text}`;
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });
  const raw = (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("");
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try { return JSON.parse(m[0]); } catch { return []; }
}

async function run() {
  if (!process.env.ANTHROPIC_API_KEY) return { error: "ANTHROPIC_API_KEY not configured", status: 500 };
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sb = supabaseAdmin();
  const todayStr = new Date().toLocaleDateString("en-CA");

  const { data: existing } = await sb.from("events").select("title_en,start_date");
  const have = new Set((existing || []).map((e) => `${(e.title_en || "").toLowerCase()}|${e.start_date || ""}`));

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
        origin_name: "Auto-discovered", origin_url: source, discovered_via: "auto-discover", photo_url: null, lat: null, lng: null,
      });
    }
  }

  let added = 0, error = null;
  if (rows.length) {
    const { data, error: e } = await sb.from("events").insert(rows).select("id");
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
