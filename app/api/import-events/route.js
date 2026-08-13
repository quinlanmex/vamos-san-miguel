import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import events from "../../../data/events-import.json";

export const runtime = "nodejs";
export const maxDuration = 60;

// Imports researched events (data/events-import.json). Events only need to be real, not
// personally vetted, so HIGH-confidence ones publish directly; LOW-confidence ones (times
// inferred) come in as drafts for a quick look. The live site only shows future events.
export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let sb;
  try { sb = supabaseAdmin(); } catch (e) { return Response.json({ error: String(e.message || e) }, { status: 500 }); }

  const { data: existing } = await sb.from("events").select("title_en,start_date");
  const have = new Set((existing || []).map((e) => `${(e.title_en || "").toLowerCase()}|${e.start_date || ""}`));

  const rows = [];
  let skipped = 0;
  for (const e of events) {
    const key = `${(e.title_en || "").toLowerCase()}|${e.start_date || ""}`;
    if (have.has(key)) { skipped++; continue; }
    have.add(key);
    rows.push({
      status: e.confidence === "LOW" ? "draft" : "published",
      title_en: e.title_en, title_es: e.title_es || null,
      blurb_en: e.blurb_en || null, blurb_es: e.blurb_es || null,
      price_en: e.price_en || null, price_es: e.price_es || null,
      category: e.category, audience: [],
      start_date: e.start_date || null, end_date: e.end_date || e.start_date || null, start_time: e.start_time || null,
      recurring: !!e.recurring, venue: e.venue || null, area: e.area || null,
      origin_name: e.origin_name || null, origin_url: e.origin_url || null,
      discovered_via: e.discovered_via || "agent-research", photo_url: null, lat: null, lng: null,
    });
  }

  let inserted = 0, error = null;
  if (rows.length) {
    const { data, error: e } = await sb.from("events").insert(rows).select("id");
    if (e) error = e.message; else inserted = data.length;
  }
  return Response.json({ ok: !error, inserted, skipped, total: events.length, error }, { status: error ? 500 : 200 });
}
