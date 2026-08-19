import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

// Google Places photo references EXPIRE, so a pick's stored photo_url (/api/place-photo?ref=...)
// silently rots over time and the card falls back to the plain gradient. This job re-fetches
// current photo references (and their required attributions) from Google for editorial picks
// and refreshes photo_url + photos + photo_attributions. It fills blanks first, then rolls
// through google-sourced photos so refs never go stale. It only touches google-sourced photos:
// a manually set photo_url (any non /api/place-photo value) is left alone.

const GGL = "/api/place-photo?ref=";
const isGoogleSourced = (u) => !u || String(u).startsWith(GGL); // null or our proxy = refreshable
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// A Google photos array -> { urls, attrs } aligned by index (up to 4). attrs[i] is the
// html_attributions Google requires us to display for urls[i] (joined if there are several).
function mapPhotos(arr) {
  const ps = (arr || []).slice(0, 4).filter((p) => p && p.photo_reference);
  return {
    urls: ps.map((p) => `${GGL}${encodeURIComponent(p.photo_reference)}`),
    attrs: ps.map((p) => (Array.isArray(p.html_attributions) ? p.html_attributions.join(" ") : "")),
  };
}

// Place Details photos for one id. Returns { urls, attrs } (possibly empty) or null if the
// lookup itself failed, so a transient error never wrongly clears a good photo.
async function detailsPhotos(placeId, key) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${key}`;
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (j.status === "NOT_FOUND" || j.status === "INVALID_REQUEST") return { urls: [], attrs: [] };
  if (j.status !== "OK" || !j.result) return null;
  return mapPhotos(j.result.photos);
}

// When a pick's linked listing has no photos (usually a stale/wrong place_id), find the right
// place by name in San Miguel and return its place_id, but only if the top result's name
// matches, so we never relink a pick to a different same-named business.
async function findPlaceId(name, key) {
  const q = `${name}, San Miguel de Allende, Mexico`;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&region=mx&key=${key}`;
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (j.status !== "OK" || !j.results || !j.results.length) return null;
  const p = j.results[0];
  const a = norm(name), b = norm(p.name);
  if (!a || !b || !(a === b || a.includes(b) || b.includes(a))) return null; // name mismatch
  return p.place_id || null;
}

// Update a place, tolerating the photo_attributions column not existing yet (pre-migration),
// so a refresh run never hard-fails before the one-time SQL is applied.
async function updatePlace(sb, id, update) {
  let { error } = await sb.from("places").update(update).eq("id", id);
  if (error && /photo_attributions/.test(error.message || "")) {
    const { photo_attributions, ...rest } = update;
    ({ error } = await sb.from("places").update(rest).eq("id", id));
  }
  return error;
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

  let refreshed = 0, relinked = 0, cleared = 0, skipped = 0, failed = 0;
  const clearedNames = [];
  const now = new Date().toISOString();
  for (const p of rows || []) {
    if (!isGoogleSourced(p.photo_url)) { skipped++; continue; } // manual photo: leave it
    let res;
    try { res = await detailsPhotos(p.google_place_id, key); } catch { failed++; continue; }
    if (res === null) { failed++; continue; } // lookup failed (rate limit etc): retry next run
    let { urls, attrs } = res;
    let newPlaceId = null;
    // No photos on the linked listing: find the right place by name, then pull photos from
    // ITS details (text search results often omit photos even when the place has them).
    if (urls.length === 0) {
      try {
        const pid = await findPlaceId(p.name, key);
        if (pid && pid !== p.google_place_id) {
          const d2 = await detailsPhotos(pid, key);
          if (d2 && d2.urls.length) { urls = d2.urls; attrs = d2.attrs; newPlaceId = pid; }
        }
      } catch { /* leave as cleared */ }
    }
    const photo_url = urls[0] || null;
    const update = { photos: urls, photo_attributions: attrs, photo_url, updated_at: now };
    if (newPlaceId) update.google_place_id = newPlaceId; // correct a stale/wrong link
    const e = await updatePlace(sb, p.id, update);
    if (e) { failed++; continue; }
    if (newPlaceId) relinked++;
    if (photo_url) refreshed++; else { cleared++; clearedNames.push(p.name); }
  }
  return { ok: true, considered: (rows || []).length, refreshed, relinked, cleared, skipped, failed, ...(clearedNames.length ? { clearedNames } : {}) };
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
