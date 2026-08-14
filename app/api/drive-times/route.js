import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 120;

// Fill real driving time (minutes) from Centro for OUT-OF-TOWN picks, via Google
// Distance Matrix. In-town picks show their colonia, so we skip them. Only fills rows
// where centro_min is null, so a value is computed once and never churns. Runs weekly
// and on demand from admin.
const CENTRO = { lat: 20.9143, lng: -100.7436 };
const IN_TOWN_KM = 4;

function km(aLat, aLng, bLat, bLng) {
  const R = 6371, toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function matrix(key, origins) {
  const o = origins.map((p) => `${p.lat},${p.lng}`).join("|");
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(o)}&destinations=${CENTRO.lat},${CENTRO.lng}&mode=driving&key=${key}`;
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (j.status !== "OK") return null;
  return (j.rows || []).map((row) => {
    const el = row.elements && row.elements[0];
    return el && el.status === "OK" && el.duration ? Math.max(1, Math.round(el.duration.value / 60)) : null;
  });
}

export async function run() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { ok: false, error: "GOOGLE_MAPS_API_KEY not configured", status: 500 };
  const sb = supabaseAdmin();

  const { data: rows, error } = await sb.from("places").select("id,name,lat,lng,centro_min").not("lat", "is", null);
  if (error) return { ok: false, error: error.message, status: 500 };

  const todo = (rows || []).filter((r) => r.centro_min == null && km(CENTRO.lat, CENTRO.lng, r.lat, r.lng) >= IN_TOWN_KM);
  if (!todo.length) return { ok: true, filled: 0, note: "No out-of-town picks need a drive time." };

  let filled = 0;
  const fails = [];
  // Distance Matrix allows up to 25 origins per request.
  for (let i = 0; i < todo.length; i += 25) {
    const batch = todo.slice(i, i + 25);
    let mins = null;
    try { mins = await matrix(key, batch); } catch { /* skip */ }
    if (!mins) { fails.push(`batch ${i}`); continue; }
    for (let k = 0; k < batch.length; k++) {
      const m = mins[k];
      if (m == null) { fails.push(batch[k].name); continue; }
      const { error: uErr } = await sb.from("places").update({ centro_min: m }).eq("id", batch[k].id).is("centro_min", null);
      if (!uErr) filled++;
    }
  }
  return { ok: fails.length === 0, filled, checked: todo.length, fails: fails.slice(0, 10) };
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
