export const runtime = "nodejs";

// Admin type-ahead for the quick-add flow. Proxies Google Places Autocomplete,
// biased to San Miguel de Allende, so the API key stays server-side. Returns a
// short list of { place_id, main, secondary } suggestions.
const CENTRO = "20.9143,-100.7436";

export async function POST(req) {
  const { password, q } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return Response.json({ error: "GOOGLE_MAPS_API_KEY not configured" }, { status: 500 });

  const input = (q || "").trim();
  if (input.length < 2) return Response.json({ ok: true, predictions: [] });

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}` +
      `&location=${CENTRO}&radius=25000&components=country:mx&types=establishment&language=en&key=${key}`;
    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));
    if (j.status !== "OK" && j.status !== "ZERO_RESULTS") {
      return Response.json({ ok: false, error: j.error_message || j.status || "autocomplete failed" }, { status: 502 });
    }
    const predictions = (j.predictions || []).slice(0, 6).map((p) => ({
      place_id: p.place_id,
      main: p.structured_formatting?.main_text || p.description || "",
      secondary: p.structured_formatting?.secondary_text || "",
    }));
    return Response.json({ ok: true, predictions });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
