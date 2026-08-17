import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

// Quick-add a single place by its Google place_id (from /api/place-autocomplete).
// Pulls Google Place Details and inserts a published, editorial pick with everything
// we can auto-fill: coords, photos, phone, website, hours, price, business status,
// and Google's editorial blurb as a starting description. Neighborhood/drive-time and
// the richer editorial notes are left to the nightly crons (they key off coords +
// google_place_id), matching the "auto-updates, never freeze it" principle.
const LIST_KEYS = ["rest", "bar", "wellness", "parks", "culture", "shopping"];
const FIELDS = [
  "name", "geometry", "formatted_address", "photos", "editorial_summary",
  "website", "formatted_phone_number", "business_status", "opening_hours",
  "types", "price_level", "place_id",
].join(",");

async function details(placeId, key) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${FIELDS}&region=mx&language=en&key=${key}`;
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (j.status !== "OK" || !j.result) return null;
  return j.result;
}

export async function POST(req) {
  const { password, place_id, list_key } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return Response.json({ error: "GOOGLE_MAPS_API_KEY not configured" }, { status: 500 });
  if (!place_id) return Response.json({ error: "place_id required" }, { status: 400 });

  const type = LIST_KEYS.includes(list_key) ? list_key : "rest";
  const sb = supabaseAdmin();

  const d = await details(place_id, key);
  if (!d) return Response.json({ ok: false, error: "Could not load details from Google" }, { status: 502 });

  const name = (d.name || "").trim();
  if (!name) return Response.json({ ok: false, error: "Google returned no name" }, { status: 502 });

  // Don't duplicate: match on google_place_id first, then on name (compared in JS so
  // names with commas/parentheses can't break a PostgREST filter).
  let dup = null;
  const { data: byId } = await sb.from("places").select("id, name").eq("google_place_id", place_id).limit(1);
  if (byId && byId.length) dup = byId[0];
  if (!dup) {
    const { data: all } = await sb.from("places").select("id, name");
    const nl = name.toLowerCase();
    dup = (all || []).find((x) => (x.name || "").toLowerCase().trim() === nl) || null;
  }
  if (dup) {
    return Response.json({ ok: false, duplicate: true, id: dup.id, name: dup.name, error: `"${dup.name}" is already in your list.` });
  }

  const loc = d.geometry && d.geometry.location;
  const photoRefs = (d.photos || []).slice(0, 4).map((p) => p.photo_reference).filter(Boolean);
  const photos = photoRefs.map((ref) => `/api/place-photo?ref=${encodeURIComponent(ref)}`);
  const hoursText = d.opening_hours && Array.isArray(d.opening_hours.weekday_text)
    ? d.opening_hours.weekday_text.join("\n")
    : null;

  const row = {
    status: "published",
    editorial: true,
    list_key: type,
    name,
    desc_en: (d.editorial_summary && d.editorial_summary.overview) || null, // crons fill/upgrade this
    desc_es: null,
    audience: [], diet: [], cuisine: [],
    lat: loc ? loc.lat : null,
    lng: loc ? loc.lng : null,
    google_place_id: d.place_id || place_id,
    photo_url: photos[0] || null,
    photos,
    phone: d.formatted_phone_number || null,
    origin_url: d.website || null,
    hours: hoursText,
    price_level: typeof d.price_level === "number" ? d.price_level : null,
    business_status: d.business_status || null,
    // area (neighborhood) intentionally left null: computed automatically from coords.
  };

  const { data, error } = await sb.from("places").insert(row).select("id, name, list_key, lat, lng, photo_url").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({ ok: true, place: data, hadPhoto: !!row.photo_url, hadDesc: !!row.desc_en });
}
