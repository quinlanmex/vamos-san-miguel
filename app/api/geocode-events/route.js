import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 120;

// Fill map coordinates for events that don't have them yet, by geocoding the
// venue name. IMPORTANT: only touches rows where lat/lng is null, so any manually
// set (or previously geocoded) coordinate is never overwritten. Runs on a daily
// cron and on-demand from admin.
const CITY = "San Miguel de Allende, Guanajuato, Mexico";
const MAX_PER_RUN = 40; // keep well under geocoding quotas

async function geocode(key, query) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=mx&key=${key}`;
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (j.status !== "OK" || !j.results || !j.results.length) return null;
  const loc = j.results[0].geometry && j.results[0].geometry.location;
  return loc ? { lat: loc.lat, lng: loc.lng } : null;
}

async function run() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { ok: false, error: "GOOGLE_MAPS_API_KEY not configured", status: 500 };
  const sb = supabaseAdmin();

  // Only events missing coordinates but with something to geocode.
  const { data: rows, error } = await sb
    .from("events")
    .select("id,title_en,venue,area")
    .is("lat", null)
    .not("venue", "is", null)
    .limit(MAX_PER_RUN);
  if (error) return { ok: false, error: error.message, status: 500 };
  if (!rows || !rows.length) return { ok: true, geocoded: 0, note: "No events need geocoding." };

  let geocoded = 0;
  const misses = [];
  for (const e of rows) {
    const query = [e.venue, e.area, CITY].filter(Boolean).join(", ");
    let loc = null;
    try { loc = await geocode(key, query); } catch { /* skip */ }
    if (!loc) { misses.push(e.venue); continue; }
    // Re-check lat is still null to avoid racing a manual edit, then write.
    const { error: uErr } = await sb.from("events").update({ lat: loc.lat, lng: loc.lng }).eq("id", e.id).is("lat", null);
    if (!uErr) geocoded++;
  }
  return { ok: true, geocoded, checked: rows.length, misses: misses.slice(0, 10) };
}

// Scheduled (Vercel cron) — protected by x-vercel-cron or a token.
export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  const secret = process.env.CRON_SECRET;
  const isCron = req.headers.get("x-vercel-cron") === "1";
  if (!isCron && !(secret && token === secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.status || (r.ok ? 200 : 500) });
}

// Manual trigger from admin.
export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.status || (r.ok ? 200 : 500) });
}
