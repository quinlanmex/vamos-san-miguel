import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import picks from "../../../data/new-picks.json";

export const runtime = "nodejs";
export const maxDuration = 120;

// One-time importer for a curated batch of new Local Picks (data/new-picks.json).
// For each, it looks the place up on Google (Text Search) to get coordinates + a photo,
// then inserts it with the given type/cuisine/tags. Coordinates let the nightly crons
// fill neighborhood, drive time, hours, and editorial notes automatically afterward.
// Skips any pick whose name already exists (never duplicates or overwrites).
async function findPlace(query, key) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=mx&key=${key}`;
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (j.status !== "OK" || !j.results || !j.results.length) return null;
  const p = j.results[0];
  const loc = p.geometry && p.geometry.location;
  const photoRef = p.photos && p.photos[0] && p.photos[0].photo_reference;
  return {
    place_id: p.place_id || null,
    lat: loc ? loc.lat : null, lng: loc ? loc.lng : null,
    photo_url: photoRef ? `/api/place-photo?ref=${encodeURIComponent(photoRef)}` : null,
  };
}

export async function run() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { ok: false, error: "GOOGLE_MAPS_API_KEY not configured", status: 500 };
  const sb = supabaseAdmin();

  const { data: existing } = await sb.from("places").select("name");
  const have = new Set((existing || []).map((x) => (x.name || "").toLowerCase().trim()));

  const rows = [];
  const notFound = [];
  let skipped = 0;
  for (const p of picks) {
    if (have.has(p.name.toLowerCase().trim())) { skipped++; continue; }
    const g = await findPlace(p.query || p.name, key);
    if (!g) notFound.push(p.name);
    rows.push({
      status: "published", editorial: true,
      list_key: p.list_key, name: p.name,
      desc_en: p.desc_en || null, desc_es: p.desc_es || null,
      category: p.category || "mercados",
      audience: [], diet: [], cuisine: p.cuisine || [],
      lat: g ? g.lat : null, lng: g ? g.lng : null,
      google_place_id: g ? g.place_id : null,
      photo_url: g ? g.photo_url : null,
    });
  }

  let added = 0, error = null;
  if (rows.length) {
    const { data, error: e } = await sb.from("places").insert(rows).select("id");
    if (e) error = e.message; else added = data.length;
  }
  return { ok: !error, added, skipped, notFound, error };
}

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.status || (r.ok ? 200 : 500) });
}
