import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 120;

// Fill the neighborhood (colonia) for Local Picks by reverse-geocoding their
// coordinates. Only touches picks whose area is blank or the generic
// "San Miguel de Allende" — an editorially set neighborhood is never overwritten.
// Out-of-town picks (>4 km from Centro) are skipped: their label is a drive time,
// so the neighborhood doesn't matter. Runs on demand from admin (and a weekly cron).
const CENTRO = { lat: 20.9143, lng: -100.7436 };
const IN_TOWN_KM = 4;
const MAX_PER_RUN = 60;

function kmFromCentro(lat, lng) {
  const R = 6371, toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat - CENTRO.lat), dLng = toRad(lng - CENTRO.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(CENTRO.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function isGeneric(area) { return !area || /^san miguel(\s+de\s+allende)?$/i.test(String(area).trim()); }

function normalizeHood(name) {
  let n = String(name || "").trim();
  n = n.replace(/^(colonia|col\.?|fraccionamiento|fracc\.?|zona)\s+/i, "").trim();
  if (/^centro$/i.test(n) || /zona\s+centro/i.test(name || "")) return "Centro";
  return n;
}

// Pull the best neighborhood-like component out of a reverse-geocode result set.
function hoodFrom(results) {
  const wanted = ["neighborhood", "sublocality_level_1", "sublocality", "colloquial_area"];
  for (const type of wanted) {
    for (const r of results || []) {
      const c = (r.address_components || []).find((ac) => (ac.types || []).includes(type));
      if (c && c.long_name) return normalizeHood(c.long_name);
    }
  }
  return null;
}

async function reverseGeocode(key, lat, lng) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=neighborhood|sublocality&language=es&key=${key}`;
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (j.status !== "OK") {
    // Retry without the result_type filter (some points only resolve broadly).
    const r2 = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=es&key=${key}`);
    const j2 = await r2.json().catch(() => ({}));
    return hoodFrom(j2.results);
  }
  return hoodFrom(j.results);
}

async function run() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { ok: false, error: "GOOGLE_MAPS_API_KEY not configured", status: 500 };
  const sb = supabaseAdmin();

  const { data: rows, error } = await sb
    .from("places").select("id,name,area,lat,lng")
    .not("lat", "is", null).limit(400);
  if (error) return { ok: false, error: error.message, status: 500 };

  const todo = (rows || [])
    .filter((r) => isGeneric(r.area) && kmFromCentro(r.lat, r.lng) < IN_TOWN_KM)
    .slice(0, MAX_PER_RUN);
  if (!todo.length) return { ok: true, labeled: 0, note: "No in-town picks need a neighborhood." };

  let labeled = 0;
  const misses = [];
  for (const p of todo) {
    let hood = null;
    try { hood = await reverseGeocode(key, p.lat, p.lng); } catch { /* skip */ }
    if (!hood) { misses.push(p.name); continue; }
    const { error: uErr } = await sb.from("places").update({ area: hood }).eq("id", p.id);
    if (!uErr) labeled++;
  }
  return { ok: true, labeled, checked: todo.length, misses: misses.slice(0, 10) };
}

export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  const secret = process.env.CRON_SECRET;
  const isCron = req.headers.get("x-vercel-cron") === "1";
  if (!isCron && !(secret && token === secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.status || (r.ok ? 200 : 500) });
}

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.status || (r.ok ? 200 : 500) });
}
