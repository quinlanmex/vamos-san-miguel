export const runtime = "nodejs";

// Lightweight geocoder for the "where you're staying" input: turn a hotel name or
// address into coordinates via Google Places Text Search, scoped to San Miguel.
export async function GET(req) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return Response.json({ error: "not configured" }, { status: 500 });
  let q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q || q.length > 160) return Response.json({ error: "bad query" }, { status: 400 });
  if (!/san miguel/i.test(q)) q += " San Miguel de Allende";

  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&region=mx&key=${key}`;
    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));
    if (j.status !== "OK" || !j.results || !j.results.length) return Response.json({ ok: false });
    const p = j.results[0];
    const loc = p.geometry && p.geometry.location;
    if (!loc) return Response.json({ ok: false });
    return Response.json({ ok: true, lat: loc.lat, lng: loc.lng, name: p.name || null });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
