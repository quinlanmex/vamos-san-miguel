import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

// Community walking paths. GET lists published paths (or one by ?id=); POST creates one
// (public submission, validated + capped); POST with action:"delete" + admin password
// moderates. Points are [{ lat, lng, label, note }].
const MAX_POINTS = 40;

function cleanPoints(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number" && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180)
    .slice(0, MAX_POINTS)
    .map((p) => ({
      lat: p.lat, lng: p.lng,
      label: typeof p.label === "string" ? p.label.slice(0, 120) : "",
      note: typeof p.note === "string" ? p.note.slice(0, 240) : "",
    }));
}

// Total path length in meters (haversine sum along the ordered points).
function distanceMeters(points) {
  const R = 6371000, tr = (x) => (x * Math.PI) / 180;
  let m = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const dLat = tr(b.lat - a.lat), dLng = tr(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(tr(a.lat)) * Math.cos(tr(b.lat)) * Math.sin(dLng / 2) ** 2;
    m += 2 * R * Math.asin(Math.sqrt(s));
  }
  return Math.round(m);
}

// Total climb in meters via Google Elevation API (sum of positive deltas). Best-effort.
async function elevationGain(points, key) {
  if (!key || points.length < 2) return null;
  try {
    const locs = points.map((p) => `${p.lat},${p.lng}`).join("|");
    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${encodeURIComponent(locs)}&key=${key}`;
    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));
    if (j.status !== "OK" || !Array.isArray(j.results)) return null;
    let gain = 0;
    for (let i = 1; i < j.results.length; i++) {
      const d = j.results[i].elevation - j.results[i - 1].elevation;
      if (d > 0) gain += d;
    }
    return Math.round(gain);
  } catch { return null; }
}

const COLS = "id,name,author,summary,points,distance_m,elev_gain_m,created_at";

export async function GET(req) {
  const sb = supabaseAdmin();
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const { data, error } = await sb.from("walking_paths").select(COLS).eq("id", id).eq("status", "published").single();
    if (error || !data) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    return Response.json({ ok: true, path: data });
  }
  const { data, error } = await sb.from("walking_paths").select(COLS).eq("status", "published").order("created_at", { ascending: false }).limit(200);
  if (error) return Response.json({ ok: false, error: friendly(error.message) }, { status: 500 });
  return Response.json({ ok: true, paths: data || [] });
}

// Turn the raw "schema cache" error into a clear instruction.
function friendly(msg) {
  if (/walking_paths/.test(msg || "") && /schema cache|does not exist/i.test(msg || "")) {
    return "The walking_paths table isn't set up yet. Run data/add-walking-paths.sql in Supabase, then try again.";
  }
  return msg;
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();

  // Admin moderation.
  if (body.action === "delete") {
    if (body.password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!body.id) return Response.json({ error: "id required" }, { status: 400 });
    const { error } = await sb.from("walking_paths").delete().eq("id", body.id);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true, deleted: true });
  }

  // Public submission.
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const points = cleanPoints(body.points);
  if (!name) return Response.json({ ok: false, error: "Please name your walk." }, { status: 400 });
  if (points.length < 2) return Response.json({ ok: false, error: "Add at least two stops." }, { status: 400 });

  const row = {
    name,
    author: typeof body.author === "string" ? body.author.trim().slice(0, 80) || null : null,
    summary: typeof body.summary === "string" ? body.summary.trim().slice(0, 400) || null : null,
    points,
    distance_m: distanceMeters(points),
    elev_gain_m: await elevationGain(points, process.env.GOOGLE_MAPS_API_KEY),
    status: "published",
  };
  const { data, error } = await sb.from("walking_paths").insert(row).select(COLS).single();
  if (error) return Response.json({ ok: false, error: friendly(error.message) }, { status: 500 });
  return Response.json({ ok: true, path: data });
}
