import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 300;

// Draft the editorial fields (why_love / what_to_order / best_time) for picks that
// don't have them yet, using the place's website + Google's editorial summary + our
// own data. Fills ONLY empty fields — a value you've written is never overwritten.
// A pick is (re)drafted only while why_love is null, so it runs once per pick. Capped
// per run to bound cost; part of the daily cron.
const MAX_PER_RUN = 15;

async function fetchSite(url) {
  if (!url || !/^https?:\/\//.test(url)) return "";
  try {
    const r = await fetch(url, { headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "accept": "text/html,application/xhtml+xml", "accept-language": "en-US,en;q=0.9,es;q=0.8",
    } });
    if (!r.ok) return "";
    const html = await r.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
  } catch { return ""; }
}

async function googleSummary(placeId, key) {
  if (!placeId || !key) return "";
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=editorial_summary&key=${key}`);
    const j = await r.json().catch(() => ({}));
    return (j.result && j.result.editorial_summary && j.result.editorial_summary.overview) || "";
  } catch { return ""; }
}

async function draft(anthropic, ctx) {
  const prompt = `You are writing for "Vamos San Miguel," a hand-picked local guide to San Miguel de Allende. Voice: warm, concise, first-person plural ("we"), specific, never salesy, never fabricated.

Using ONLY the information below, draft short editorial notes for this place. Do not invent facts, dishes, or details that aren't supported by the info. If you can't support a field, use null.

Provide BOTH English and natural Mexican-Spanish for each field (the Spanish is a fluent localization, not a literal translation).
Return ONLY JSON: {"why_love": string|null, "why_love_es": string|null, "what_to_order": string|null, "what_to_order_es": string|null, "best_time": string|null, "best_time_es": string|null}
- why_love: 1–2 sentences on what makes it special / why we send friends there.
- what_to_order: for food/drink places, the signature things to get IF named in the info; otherwise null.
- best_time: only if clearly inferable (e.g. rooftop → sunset; busy spot → weekday mornings); otherwise null.

PLACE:
name: ${ctx.name}
type: ${ctx.list_key}
cuisine/tags: ${(ctx.cuisine || []).join(", ")}
area: ${ctx.area || ""}
our short note: ${ctx.desc || ""}
google summary: ${ctx.gsum || ""}
website text: ${ctx.site || ""}`;
  const msg = await anthropic.messages.create({ model: "claude-haiku-4-5-20251001", max_tokens: 700, messages: [{ role: "user", content: prompt }] });
  const raw = (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("");
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export async function run() {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "ANTHROPIC_API_KEY not configured", status: 500 };
  const sb = supabaseAdmin();
  const key = process.env.GOOGLE_MAPS_API_KEY;

  const { data: rows, error } = await sb
    .from("places").select("id,name,list_key,cuisine,area,desc_en,origin_url,google_place_id,why_love,why_love_es,what_to_order,what_to_order_es,best_time,best_time_es")
    .is("why_love", null).eq("status", "published").limit(MAX_PER_RUN);
  if (error) return { ok: false, error: error.message, status: 500 };
  if (!rows || !rows.length) return { ok: true, drafted: 0, note: "All picks have editorial notes." };

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let drafted = 0;
  const fails = [];
  for (const p of rows) {
    const [site, gsum] = await Promise.all([fetchSite(p.origin_url), googleSummary(p.google_place_id, key)]);
    let d = null;
    try { d = await draft(anthropic, { name: p.name, list_key: p.list_key, cuisine: p.cuisine, area: p.area, desc: p.desc_en, site, gsum }); }
    catch { d = null; }
    if (!d || !d.why_love) { fails.push(p.name); continue; }
    // Fill only the fields that are still empty (never overwrite a manual value).
    const patch = {};
    const fill = (col, val) => { if (p[col] == null && val) patch[col] = String(val).trim(); };
    fill("why_love", d.why_love); fill("why_love_es", d.why_love_es);
    fill("what_to_order", d.what_to_order); fill("what_to_order_es", d.what_to_order_es);
    fill("best_time", d.best_time); fill("best_time_es", d.best_time_es);
    if (!Object.keys(patch).length) continue;
    const { error: uErr } = await sb.from("places").update(patch).eq("id", p.id);
    if (!uErr) drafted++;
  }
  return { ok: fails.length === 0, drafted, checked: rows.length, fails: fails.slice(0, 10) };
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
