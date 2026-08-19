import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { detailsPhotos, findPlaceId } from "../refresh-photos/route";

export const runtime = "nodejs";
export const maxDuration = 60;

// Give events a photo by pulling one of their VENUE from Google Places (name-matched so we never
// grab the wrong place), the same live-photo approach the picks use. Only fills events that lack
// a photo and name a venue; a manually set or already-present photo is never touched. Events
// with no matchable venue keep their colored category tile.
export async function run(limit = 30) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { ok: false, error: "GOOGLE_MAPS_API_KEY not configured" };
  let sb;
  try { sb = supabaseAdmin(); } catch (e) { return { ok: false, error: String(e && e.message || e) }; }

  // Upcoming/recurring published events that have a venue but no photo yet.
  const todayStr = new Date().toLocaleDateString("en-CA");
  const { data: rows, error } = await sb.from("events")
    .select("id,title_en,venue,photo_url,recurring,end_date,start_date")
    .eq("status", "published").is("photo_url", null).not("venue", "is", null)
    .limit(limit);
  if (error) return { ok: false, error: error.message };
  if (!rows || !rows.length) return { ok: true, considered: 0, added: 0 };

  let added = 0, skipped = 0, failed = 0;
  for (const ev of rows) {
    // Skip past one-off events (no point sourcing a photo for something already over).
    if (!ev.recurring) { const last = ev.end_date || ev.start_date; if (last && last < todayStr) { skipped++; continue; } }
    const venue = (ev.venue || "").trim();
    if (!venue) { skipped++; continue; }
    let placeId;
    try { placeId = await findPlaceId(venue, key); } catch { failed++; continue; }
    if (!placeId) { skipped++; continue; } // no confident venue match
    let photos;
    try { photos = await detailsPhotos(placeId, key); } catch { failed++; continue; }
    if (!photos || !photos.urls.length) { skipped++; continue; }
    const update = { photo_url: photos.urls[0], photo_attributions: photos.attrs };
    let { error: e } = await sb.from("events").update(update).eq("id", ev.id);
    if (e && /photo_attributions/.test(e.message || "")) ({ error: e } = await sb.from("events").update({ photo_url: photos.urls[0] }).eq("id", ev.id));
    if (e) failed++; else added++;
  }
  return { ok: true, considered: rows.length, added, skipped, failed };
}

export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  const secret = process.env.CRON_SECRET;
  const isCron = req.headers.get("x-vercel-cron") === "1";
  if (!isCron && !(secret && token === secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.ok ? 200 : 500 });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (body.password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const limit = Math.min(Math.max(Number(body.limit) || 200, 1), 400);
  const r = await run(limit);
  return Response.json(r, { status: r.ok ? 200 : 500 });
}
