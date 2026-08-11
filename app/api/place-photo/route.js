export const runtime = "nodejs";

// Proxies a Google Places (New) photo so the API key stays server-side and we
// comply with Google's terms (served live via the API, not re-hosted).
export async function GET(req) {
  const ref = new URL(req.url).searchParams.get("ref");
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!ref || !key) return new Response("Missing ref or key", { status: 400 });
  const url = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=900&key=${key}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return new Response("Photo unavailable", { status: r.status });
    const buf = await r.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": r.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return new Response("Photo fetch failed", { status: 502 });
  }
}
