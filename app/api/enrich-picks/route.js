import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 300;

// Enrich picks with PRACTICAL facts from Google Places: opening hours + a few useful
// attributes (reservations, vegetarian, wheelchair, beer/wine, takeout/delivery/dine-in)
// and price level. NO ratings or reviews are fetched or stored (editorial choice).
// Refreshes weekly and is capped per run to bound API cost. Never overwrites a manually
// set price_level or hours text — those live in separate fields.
const FIELDS = "opening_hours,price_level,reservable,serves_vegetarian_food,wheelchair_accessible_entrance,serves_beer,serves_wine,takeout,delivery,dine_in";
const STALE_DAYS = 7;
const MAX_PER_RUN = 30;

async function details(placeId, key) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${FIELDS}&key=${key}`;
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (j.status !== "OK" || !j.result) return null;
  return j.result;
}

export async function run() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { ok: false, error: "GOOGLE_MAPS_API_KEY not configured", status: 500 };
  const sb = supabaseAdmin();

  const { data: rows, error } = await sb
    .from("places").select("id,name,google_place_id,price_level,enriched_at")
    .not("google_place_id", "is", null);
  if (error) return { ok: false, error: error.message, status: 500 };

  const cutoff = Date.now() - STALE_DAYS * 864e5;
  const todo = (rows || [])
    .filter((r) => !r.enriched_at || new Date(r.enriched_at).getTime() < cutoff)
    .slice(0, MAX_PER_RUN);
  if (!todo.length) return { ok: true, enriched: 0, note: "All picks are freshly enriched." };

  let enriched = 0;
  const fails = [];
  for (const p of todo) {
    let d = null;
    try { d = await details(p.google_place_id, key); } catch { /* skip */ }
    if (!d) { fails.push(p.name); continue; }
    const oh = d.opening_hours || {};
    const patch = {
      hours_json: (oh.weekday_text || oh.periods) ? { weekday_text: oh.weekday_text || null, periods: oh.periods || null } : null,
      place_attrs: {
        reservable: d.reservable ?? null,
        vegetarian: d.serves_vegetarian_food ?? null,
        wheelchair: d.wheelchair_accessible_entrance ?? null,
        beer: d.serves_beer ?? null,
        wine: d.serves_wine ?? null,
        takeout: d.takeout ?? null,
        delivery: d.delivery ?? null,
        dine_in: d.dine_in ?? null,
      },
      enriched_at: new Date().toISOString(),
    };
    // Only fill price_level if we don't already have one (never overwrite a manual value).
    if (p.price_level == null && d.price_level != null) patch.price_level = d.price_level;
    const { error: uErr } = await sb.from("places").update(patch).eq("id", p.id);
    if (!uErr) enriched++;
  }
  return { ok: fails.length === 0, enriched, checked: todo.length, fails: fails.slice(0, 10) };
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
