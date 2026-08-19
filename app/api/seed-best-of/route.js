import { readFile } from "node:fs/promises";
import path from "node:path";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

// One-shot: crown best-of winners + runners-up for categories the owner does not
// personally frequent (cocktails, mezcal, live music, spa), from a hardcoded,
// Google-verified list in data/best-of-seed.json. Idempotent-ish: matches existing
// published places by name before adding new ones via Google Places. Admin guarded.

// Normalize a name: lowercase, strip accents, drop the trailing town suffix.
const norm = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+san miguel de allende$/i, "")
    .trim();

// Clean a seed name for storage: drop the trailing town suffix.
const cleanName = (s) => (s || "").replace(/\s+San Miguel de Allende$/i, "").trim();

// Which list_key a slug's places belong to.
const listKeyFor = (slug) => (slug === "best_spa" ? "wellness" : "bar");

// Google Places Text Search -> { place_id, lat, lng, photo_url } (same shape as seed-markets).
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
    lat: loc ? loc.lat : null,
    lng: loc ? loc.lng : null,
    photo_url: photoRef ? `/api/place-photo?ref=${encodeURIComponent(photoRef)}` : null,
  };
}

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  const sb = supabaseAdmin();
  const notes = [];
  if (!key) notes.push("GOOGLE_MAPS_API_KEY missing: matching existing places only, skipping Google adds");

  // Load the seed list.
  const seedPath = path.join(process.cwd(), "data", "best-of-seed.json");
  let seed;
  try {
    seed = JSON.parse(await readFile(seedPath, "utf8"));
  } catch (e) {
    return Response.json({ ok: false, error: `Could not load data/best-of-seed.json: ${e.message}` }, { status: 500 });
  }

  // Pull all places once for name matching.
  const { data: allPlaces } = await sb.from("places").select("id, name, google_place_id, status");

  // Resolve a place NAME to a places row id. Matches an existing published place by
  // normalized name (exact or includes), else adds via Google. Returns id or null.
  async function ensurePlace(name, slug) {
    const target = norm(name);
    if (target) {
      for (const p of allPlaces || []) {
        if (p.status !== "published") continue;
        const pn = norm(p.name);
        if (pn && (pn === target || pn.includes(target) || target.includes(pn))) return p.id;
      }
    }
    if (!key) return null;
    const g = await findPlace(name, key);
    if (!g) return null;
    const row = {
      status: "published",
      editorial: true,
      list_key: listKeyFor(slug),
      name: cleanName(name),
      lat: g.lat,
      lng: g.lng,
      google_place_id: g.place_id,
      photo_url: g.photo_url,
    };
    const { data: ins, error } = await sb.from("places").insert(row).select("id, name, google_place_id, status").single();
    if (error || !ins) return null;
    (allPlaces || []).push(ins); // so later runners can match it
    return ins.id;
  }

  // Append a slug to a place's best_of array (dedupe).
  async function mirrorBestOf(placeId, slug) {
    const { data: place } = await sb.from("places").select("best_of").eq("id", placeId).single();
    const current = Array.isArray(place?.best_of) ? place.best_of : [];
    if (!current.includes(slug)) {
      await sb.from("places").update({ best_of: [...current, slug] }).eq("id", placeId);
    }
  }

  const results = [];
  for (const entry of seed) {
    const slug = entry.slug;

    // Category must exist.
    const { data: cat } = await sb.from("best_of_categories").select("slug").eq("slug", slug).maybeSingle();
    if (!cat) {
      results.push({ slug, status: "category missing, run add-best-of-more.sql" });
      continue;
    }

    // Winner.
    const winnerId = await ensurePlace(entry.winner, slug);
    if (winnerId) {
      await sb.from("best_of_categories").update({ winner_place_id: winnerId, updated_at: new Date().toISOString() }).eq("slug", slug);
      await mirrorBestOf(winnerId, slug);
    }

    // Runners (max 2).
    const runnerIds = [];
    for (const rn of entry.runners || []) {
      if (runnerIds.length >= 2) break;
      const id = await ensurePlace(rn, slug);
      if (id) runnerIds.push(id);
    }
    if (runnerIds.length) {
      await sb.from("best_of_categories").update({ runner_up_ids: runnerIds, updated_at: new Date().toISOString() }).eq("slug", slug);
    }

    results.push({ slug, winner: winnerId ? cleanName(entry.winner) : "not found", runners: runnerIds.length });
  }

  return Response.json({ ok: true, results, ...(notes.length ? { notes } : {}) });
}
