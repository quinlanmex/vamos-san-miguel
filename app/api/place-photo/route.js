import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { detailsPhotos, findPlaceId } from "../refresh-photos/route";

export const runtime = "nodejs";

// Proxies a Google Places photo so the API key stays server-side and we comply with
// Google's terms (served live via the API, not re-hosted).
//
// Google photo references EXPIRE. When Google rejects a stored ref, this route heals it on
// the spot: it finds the place (or event) that stored this URL, pulls fresh photo refs from
// Google, saves them, and serves the new photo. So pictures never stay broken waiting for
// the daily refresh job.

const GGL = "/api/place-photo?ref=";

async function fetchPhoto(ref, key) {
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=900&photo_reference=${encodeURIComponent(ref)}&key=${key}`;
  return fetch(url);
}

function imageResponse(r, buf) {
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": r.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

// Update a row, tolerating a missing photo_attributions column.
async function update(sb, table, id, data) {
  let { error } = await sb.from(table).update(data).eq("id", id);
  if (error && /photo_attributions/.test(error.message || "")) {
    const { photo_attributions, ...rest } = data;
    ({ error } = await sb.from(table).update(rest).eq("id", id));
  }
  return error;
}

// Find who stored this photo URL and give them fresh refs. Returns the replacement ref
// for this exact photo, or null if nothing could be healed.
async function heal(oldUrl, key, why) {
  let sb;
  try { sb = supabaseAdmin(); } catch (e) { why.push("db:" + (e && e.message)); return null; }
  const now = new Date().toISOString();

  // 1) A place whose main photo or gallery holds this URL.
  let place = null;
  const a = await sb.from("places").select("id,name,google_place_id,photos").eq("photo_url", oldUrl).limit(1);
  if (a.error) why.push("q1:" + a.error.message);
  if (a.data && a.data.length) place = a.data[0];
  if (!place) {
    try {
      const b = await sb.from("places").select("id,name,google_place_id,photos").contains("photos", [oldUrl]).limit(1);
      if (b.data && b.data.length) place = b.data[0];
    } catch { /* column type mismatch: skip gallery lookup */ }
  }
  if (place) {
    let res = place.google_place_id ? await detailsPhotos(place.google_place_id, key).catch(() => null) : null;
    let newPid = null;
    if (!res || !res.urls.length) {
      const pid = await findPlaceId(place.name, key).catch(() => null);
      if (pid) {
        const d = await detailsPhotos(pid, key).catch(() => null);
        if (d && d.urls.length) { res = d; if (pid !== place.google_place_id) newPid = pid; }
      }
    }
    if (!res && place.google_place_id) {
      try {
        const j = await (await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place.google_place_id)}&fields=photos&key=${key}`)).json();
        why.push("details:" + j.status + ":" + (j.error_message || "").slice(0, 120));
      } catch {}
    }
    if (!res || !res.urls.length) { why.push("place:" + place.id + ":" + (res ? "nophotos" : "details-failed")); return null; }
    const data = { photos: res.urls, photo_attributions: res.attrs, photo_url: res.urls[0], updated_at: now };
    if (newPid) data.google_place_id = newPid;
    const ue = await update(sb, "places", place.id, data);
    if (ue) why.push("save:" + ue.message);
    // Keep the same slot in the gallery if we can, otherwise use the main photo.
    const idx = Array.isArray(place.photos) ? place.photos.indexOf(oldUrl) : -1;
    const url = res.urls[idx >= 0 && idx < res.urls.length ? idx : 0];
    return decodeURIComponent(url.slice(GGL.length));
  }

  // 2) An event that uses this URL (its venue's photo).
  const e = await sb.from("events").select("id,venue").eq("photo_url", oldUrl).limit(1);
  const ev = e.data && e.data[0];
  if (!ev) why.push("nomatch");
  if (ev && ev.venue) {
    const pid = await findPlaceId(ev.venue, key).catch(() => null);
    if (!pid) return null;
    const res = await detailsPhotos(pid, key).catch(() => null);
    if (!res || !res.urls.length) return null;
    await update(sb, "events", ev.id, { photo_url: res.urls[0], photo_attributions: res.attrs });
    return decodeURIComponent(res.urls[0].slice(GGL.length));
  }
  return null;
}

export async function GET(req) {
  const ref = new URL(req.url).searchParams.get("ref");
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!ref || !key) return new Response("Missing ref or key", { status: 400 });
  try {
    const r = await fetchPhoto(ref, key);
    if (r.ok) return imageResponse(r, await r.arrayBuffer());

    // Expired or invalid ref: try to heal it once.
    const why = ["google:" + r.status];
    const fresh = await heal(`${GGL}${encodeURIComponent(ref)}`, key, why).catch((e) => { why.push("err:" + (e && e.message)); return null; });
    if (fresh && fresh !== ref) {
      const r2 = await fetchPhoto(fresh, key);
      if (r2.ok) return imageResponse(r2, await r2.arrayBuffer());
      why.push("fresh:" + r2.status);
    }
    return new Response("Photo unavailable", { status: 404, headers: { "X-Photo-Heal": why.join(" | ").slice(0, 300) } });
  } catch (e) {
    return new Response("Photo fetch failed", { status: 502 });
  }
}
