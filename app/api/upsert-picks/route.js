import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import updates from "../../../data/park-updates.json";

export const runtime = "nodejs";
export const maxDuration = 120;

// Targeted upsert for an explicit list (data/park-updates.json): recategorize existing
// picks (set list_key + ADD facets, never removing) and add any that don't exist yet via
// Google Text Search for coordinates/photo. Only touches the named picks; descriptions of
// existing picks are left alone (editorial content is never overwritten).
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

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return Response.json({ error: "GOOGLE_MAPS_API_KEY not configured" }, { status: 500 });
  const sb = supabaseAdmin();

  const { data: existing } = await sb.from("places").select("id,name,cuisine");
  const byName = new Map((existing || []).map((r) => [(r.name || "").toLowerCase().trim(), r]));

  let added = 0, updated = 0;
  const notFound = [];
  for (const p of updates) {
    const hit = byName.get(p.name.toLowerCase().trim());
    if (hit) {
      // Recategorize + add facets (union, never remove); leave description/editorial alone.
      const merged = Array.from(new Set([...(hit.cuisine || []), ...(p.add || [])]));
      const { error } = await sb.from("places").update({ list_key: p.list_key, cuisine: merged }).eq("id", hit.id);
      if (!error) updated++;
    } else {
      const g = await findPlace(p.query || p.name, key);
      if (!g) notFound.push(p.name);
      const { error } = await sb.from("places").insert({
        status: "published", editorial: true, list_key: p.list_key, name: p.name,
        desc_en: p.desc_en || null, desc_es: p.desc_es || null, category: p.category || "tours",
        audience: [], diet: [], cuisine: p.add || [],
        lat: g ? g.lat : null, lng: g ? g.lng : null, google_place_id: g ? g.place_id : null, photo_url: g ? g.photo_url : null,
      });
      if (!error) added++;
    }
  }
  return Response.json({ ok: true, added, updated, notFound });
}
