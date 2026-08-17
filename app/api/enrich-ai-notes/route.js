import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 300;

// Build a rich AI-facing profile per pick from public review signal + the place's site.
// IMPORTANT: we send reviews to Claude transiently to SYNTHESIZE a profile and store only
// that synthesis (what it's known for, vibe, standout items, who it's for, caveats). We do
// not store raw third-party review text. Fills only picks without ai_notes yet, capped per
// run to bound cost; part of the daily cron.
const MAX_PER_RUN = 12;
const FIELDS = "editorial_summary,reviews,types,price_level,serves_vegetarian_food,outdoor_seating,reservable";

async function placeDetails(placeId, key) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${FIELDS}&reviews_no_translations=true&key=${key}`;
    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));
    return j.status === "OK" ? j.result : null;
  } catch { return null; }
}
async function siteText(url) {
  if (!url || !/^https?:\/\//.test(url)) return "";
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36", "accept": "text/html" } });
    if (!r.ok) return "";
    const html = await r.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);
  } catch { return ""; }
}

async function synthesize(anthropic, ctx) {
  const reviewBlob = (ctx.reviews || []).map((r) => (r.text || "")).join("\n---\n").slice(0, 6000);
  const prompt = `You are building an internal profile of a place in San Miguel de Allende, for an AI concierge to use when planning trips and answering questions. Synthesize the sources below into a compact, factual profile. Do NOT copy review sentences verbatim; write your own synthesis. If the sources conflict or are thin, say what you can support and no more.

Return plain text (no markdown headers), ~120 words max, covering as available: what it's known for / signature items, the vibe and setting, who it's best for (couples, families, groups, remote work), price feel, standout positives, and any recurring caveat (slow service, cash only, gets busy, hard to find). Neutral, useful, honest.

PLACE: ${ctx.name} (${ctx.list_key}), ${ctx.area || "San Miguel de Allende"}
OUR NOTE: ${ctx.desc || ""}
GOOGLE EDITORIAL: ${ctx.gsum || ""}
ATTRIBUTES: ${JSON.stringify(ctx.attrs || {})}
REVIEW SIGNAL (synthesize, do not quote): ${reviewBlob}
WEBSITE: ${ctx.site || ""}`;
  const msg = await anthropic.messages.create({ model: "claude-haiku-4-5-20251001", max_tokens: 400, messages: [{ role: "user", content: prompt }] });
  return (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}

export async function run() {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "ANTHROPIC_API_KEY not configured", status: 500 };
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { ok: false, error: "GOOGLE_MAPS_API_KEY not configured", status: 500 };
  const sb = supabaseAdmin();

  const { data: rows, error } = await sb
    .from("places").select("id,name,list_key,area,desc_en,origin_url,google_place_id,place_attrs,ai_notes")
    .is("ai_notes", null).not("google_place_id", "is", null).eq("status", "published").limit(MAX_PER_RUN);
  if (error) return { ok: false, error: error.message, status: 500 };
  if (!rows || !rows.length) return { ok: true, enriched: 0, note: "All picks have AI notes." };

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let enriched = 0;
  const fails = [];
  for (const p of rows) {
    const [d, site] = await Promise.all([placeDetails(p.google_place_id, key), siteText(p.origin_url)]);
    let notes = "";
    try {
      notes = await synthesize(anthropic, {
        name: p.name, list_key: p.list_key, area: p.area, desc: p.desc_en,
        gsum: (d && d.editorial_summary && d.editorial_summary.overview) || "",
        reviews: (d && d.reviews) || [], attrs: p.place_attrs || {}, site,
      });
    } catch { notes = ""; }
    if (!notes) { fails.push(p.name); continue; }
    const { error: uErr } = await sb.from("places").update({ ai_notes: notes.slice(0, 2000), ai_notes_at: new Date().toISOString() }).eq("id", p.id);
    if (!uErr) enriched++;
  }
  return { ok: fails.length === 0, enriched, checked: rows.length, fails: fails.slice(0, 10) };
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
