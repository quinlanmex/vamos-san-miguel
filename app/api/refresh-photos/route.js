import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

// Google Places photo references EXPIRE, so a pick's stored photo_url (/api/place-photo?ref=...)
// silently rots over time and the card falls back to the plain gradient. This job re-fetches
// current photo references from Google for editorial picks and refreshes photo_url + photos.
// It fills blanks first, then rolls through google-sourced photos so refs never go stale. It
// only touches google-sourced photos: a manually set photo_url (any non /api/place-photo value)
// is left alone, so Jeff's own edits are never overwritten.

const GGL = "/api/place-photo?ref=";
const isGoogleSourced = (u) => !u || String(u).startsWith(GGL); // null or our proxy = refreshable

// Place Details (photos only) -> up to 4 fresh photo proxy URLs.
async function fetchPhotos(placeId, key) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${key}`;
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (j.status !== "OK" || !j.result) return null;
  const refs = (j.result.photos || []).slice(0, 4).map((p) => p.photo_reference).filter(Boolean);
  return refs.map((ref) => `${GGL}${encodeURIComponent(ref)}`);
}

// limit caps how many picks we touch per run (Google latency vs. the 60s function budget).
export async function run(limit = 25) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { ok: false, error: "GOOGLE_MAPS_API_KEY not configured" };
  let sb;
  try { sb = supabaseAdmin(); } catch (e) { return { ok: false, error: String(e && e.message || e) }; }

  // Published editorial picks that have a Google id. Blanks (no photo_url) first, then the
  // least-recently-updated, so every pick's ref gets cycled over time.
  const { data: rows, error } = await sb
    .from("places")
    .select("id,name,photo_url,google_place_id,updated_at")
    .eq("status", "published").eq("editorial", true)
    .not("google_place_id", "is", null)
    .order("photo_url", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) return { ok: false, error: error.message };

  let refreshed = 0, cleared = 0, skipped = 0, failed = 0;
  const now = new Date().toISOString();
  for (const p of rows || []) {
    if (!isGoogleSourced(p.photo_url)) { skipped++; continue; } // manual photo: leave it
    let photos;
    try { photos = await fetchPhotos(p.google_place_id, key); } catch { failed++; continue; }
    if (photos === null) { failed++; continue; } // Google lookup failed, try again next run
    const photo_url = photos[0] || null;
    const { error: e } = await sb.from("places")
      .update({ photos, photo_url, updated_at: now }).eq("id", p.id);
    if (e) { failed++; continue; }
    if (photo_url) refreshed++; else cleared++; // cleared = Google now has no photos for it
  }
  return { ok: true, considered: (rows || []).length, refreshed, cleared, skipped, failed };
}

// Cron entry (via cron-daily import) also reachable directly with the CRON token.
export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  const secret = process.env.CRON_SECRET;
  const isCron = req.headers.get("x-vercel-cron") === "1";
  if (!isCron && !(secret && token === secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.ok ? 200 : 500 });
}

// Admin trigger. { password, limit? } — pass a larger limit to sweep everything in one shot.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (body.password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const limit = Math.min(Math.max(Number(body.limit) || 200, 1), 400);
  const r = await run(limit);
  return Response.json(r, { status: r.ok ? 200 : 500 });
}
