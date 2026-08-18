import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 300;

// Draft the local-knowledge fields (local_take, vibe, occasion, honest internal caveat) for
// published picks that don't have them yet, so the AI sounds like a real, opinionated local.
// We send reviews + site text to Claude transiently to SYNTHESIZE these fields and store only
// the synthesis. Fills only picks without a local_take yet, capped per run to bound cost;
// part of the daily cron. LOCKED EDITS: only empty/null columns are written, so a value Jeff
// set by hand is never overwritten.
const MAX_PER_RUN = 12;
const FIELDS = "editorial_summary,reviews,types,price_level,serves_vegetarian_food,outdoor_seating,reservable";

const VIBE_SET = ["romantic", "buzzy", "quiet", "cozy", "lively", "upscale", "casual", "work-friendly"];
const OCCASION_SET = ["date", "celebration", "solo", "kids", "groups", "business"];

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

const LOCAL_TOOL = {
  name: "local_knowledge",
  description: "Return the drafted local-knowledge fields for this place.",
  input_schema: {
    type: "object",
    properties: {
      local_take: { type: "string", description: "A warm, specific, opinionated 1-2 sentence local take in English, grounded ONLY in the evidence. No invented specifics." },
      local_take_es: { type: "string", description: "The same take in natural Mexican Spanish." },
      vibe: { type: "array", items: { type: "string", enum: VIBE_SET }, description: "2-3 vibe words from the allowed set." },
      occasion: { type: "array", items: { type: "string", enum: OCCASION_SET }, description: "Occasions this place is good for, from the allowed set." },
      caveat_internal: { type: "string", description: "An honest internal caveat (what to skip / who it is not for). Stays private, never shown publicly." },
    },
    required: ["local_take", "local_take_es", "vibe", "occasion", "caveat_internal"],
  },
};

async function synthesize(anthropic, ctx) {
  const reviewBlob = (ctx.reviews || []).map((r) => (r.text || "")).join("\n---\n").slice(0, 6000);
  const prompt = `You are a sharp, honest local in San Miguel de Allende helping build a curated guide. Draft the local-knowledge fields for the place below, using ONLY the evidence provided. Do not invent specifics (no made-up dishes, prices, or details). Never use em-dashes or en-dashes; use commas, periods, or "and"/"y".

Write:
- local_take: a warm, specific, opinionated 1 to 2 sentence take that sounds like a real local who has been there.
- local_take_es: the same take in natural Mexican Spanish.
- vibe: 2 to 3 words from this set only: ${VIBE_SET.join(", ")}.
- occasion: from this set only: ${OCCASION_SET.join(", ")}.
- caveat_internal: an honest, private note on what to skip or who it is not for. This is internal only and never shown publicly, so be candid.

PLACE: ${ctx.name}${ctx.list_key ? ` (${ctx.list_key})` : ""}, ${ctx.area || "San Miguel de Allende"}
OUR NOTE: ${ctx.desc || ""}
WHAT TO ORDER: ${ctx.what_to_order || ""}
GOOD TO KNOW: ${ctx.tip || ""}
BEST TIME: ${ctx.best_time || ""}
CUISINE: ${Array.isArray(ctx.cuisine) ? ctx.cuisine.join(", ") : (ctx.cuisine || "")}
PRICE LEVEL: ${ctx.price_level || ""}
GOOGLE EDITORIAL: ${ctx.gsum || ""}
REVIEW SIGNAL (synthesize, do not quote): ${reviewBlob}
WEBSITE: ${ctx.site || ""}`;
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 700,
    tools: [LOCAL_TOOL],
    tool_choice: { type: "tool", name: "local_knowledge" },
    messages: [{ role: "user", content: prompt }],
  });
  const block = (msg.content || []).find((b) => b.type === "tool_use" && b.name === "local_knowledge");
  return block ? block.input : null;
}

export async function run() {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "ANTHROPIC_API_KEY not configured", status: 500 };
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { ok: false, error: "GOOGLE_MAPS_API_KEY not configured", status: 500 };
  const sb = supabaseAdmin();

  const { data: rows, error } = await sb
    .from("places").select("id,name,list_key,area,desc_en,what_to_order,tip,best_time,cuisine,price_level,origin_url,google_place_id,place_attrs,local_take,local_take_es,vibe,occasion,caveat_internal")
    .is("local_take", null).not("google_place_id", "is", null).eq("status", "published").limit(MAX_PER_RUN);
  if (error) return { ok: false, error: error.message, status: 500 };
  if (!rows || !rows.length) return { ok: true, enriched: 0, checked: 0, note: "All picks have a local take." };

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let enriched = 0;
  const fails = [];
  for (const p of rows) {
    const [d, site] = await Promise.all([placeDetails(p.google_place_id, key), siteText(p.origin_url)]);
    let out = null;
    try {
      out = await synthesize(anthropic, {
        name: p.name, list_key: p.list_key, area: p.area, desc: p.desc_en,
        what_to_order: p.what_to_order, tip: p.tip, best_time: p.best_time,
        cuisine: p.cuisine, price_level: p.price_level,
        gsum: (d && d.editorial_summary && d.editorial_summary.overview) || "",
        reviews: (d && d.reviews) || [], site,
      });
    } catch { out = null; }
    if (!out) { fails.push(p.name); continue; }

    // LOCKED EDITS — only write columns that are currently empty/null on this row.
    const upd = {};
    const isEmpty = (v) => v == null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
    if (isEmpty(p.local_take) && out.local_take) upd.local_take = String(out.local_take).slice(0, 600);
    if (isEmpty(p.local_take_es) && out.local_take_es) upd.local_take_es = String(out.local_take_es).slice(0, 600);
    if (isEmpty(p.vibe) && Array.isArray(out.vibe)) { const v = out.vibe.filter((x) => VIBE_SET.includes(x)); if (v.length) upd.vibe = v.slice(0, 3); }
    if (isEmpty(p.occasion) && Array.isArray(out.occasion)) { const o = out.occasion.filter((x) => OCCASION_SET.includes(x)); if (o.length) upd.occasion = o; }
    if (isEmpty(p.caveat_internal) && out.caveat_internal) upd.caveat_internal = String(out.caveat_internal).slice(0, 600);
    if (!Object.keys(upd).length) continue;
    upd.last_verified = new Date().toISOString().slice(0, 10);
    upd.updated_at = new Date().toISOString();
    const { error: uErr } = await sb.from("places").update(upd).eq("id", p.id);
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
