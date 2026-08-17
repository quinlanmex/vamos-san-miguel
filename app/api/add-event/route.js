import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 45;

// Quick-add an EVENT from a Google place_id (used for markets, venues, and recurring
// happenings that have a Google listing, e.g. the Saturday organic market). Pulls the
// name, photo, coordinates, and venue from Google and inserts a DRAFT event, so the
// editor can then set the date, recurrence, category, and priority before publishing.
const FIELDS = ["name", "geometry", "formatted_address", "photos", "editorial_summary", "types", "place_id"].join(",");
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function guessCategory(types) {
  const t = new Set(types || []);
  if (t.has("supermarket") || t.has("grocery_or_supermarket") || t.has("market")) return "mercados";
  if (t.has("spa") || t.has("gym") || t.has("health")) return "bienestar";
  if (t.has("movie_theater")) return "cine";
  if (t.has("tourist_attraction") || t.has("travel_agency")) return "tours";
  return "comunidad";
}

async function details(placeId, key) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${FIELDS}&region=mx&language=en&key=${key}`;
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (j.status !== "OK" || !j.result) return null;
  return j.result;
}

export async function POST(req) {
  const { password, place_id } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return Response.json({ error: "GOOGLE_MAPS_API_KEY not configured" }, { status: 500 });
  if (!place_id) return Response.json({ error: "place_id required" }, { status: 400 });

  const sb = supabaseAdmin();
  const d = await details(place_id, key);
  if (!d) return Response.json({ ok: false, error: "Could not load details from Google" }, { status: 502 });
  const name = (d.name || "").trim();
  if (!name) return Response.json({ ok: false, error: "Google returned no name" }, { status: 502 });

  // Don't duplicate an existing event (normalized title compared in JS).
  const { data: all } = await sb.from("events").select("id, title_en");
  const dup = (all || []).find((e) => norm(e.title_en) === norm(name));
  if (dup) return Response.json({ ok: false, duplicate: true, id: dup.id, name: dup.title_en, error: `"${dup.title_en}" is already in your events.` });

  const loc = d.geometry && d.geometry.location;
  const photoRef = d.photos && d.photos[0] && d.photos[0].photo_reference;

  const row = {
    status: "draft", // needs a date/recurrence before it shows on the site
    recurring: false,
    category: guessCategory(d.types),
    title_en: name, title_es: null,
    blurb_en: (d.editorial_summary && d.editorial_summary.overview) || null, blurb_es: null,
    venue: name,
    lat: loc ? loc.lat : null, lng: loc ? loc.lng : null,
    photo_url: photoRef ? `/api/place-photo?ref=${encodeURIComponent(photoRef)}` : null,
    discovered_via: "google-quickadd",
  };

  const { data, error } = await sb.from("events").insert(row).select("*").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, event: data });
}
