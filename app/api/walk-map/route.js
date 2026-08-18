import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

// Renders a walk as a STATIC map picture (route polyline + start/end markers) via Google
// Static Maps, proxied so the API key stays server-side. Used as the walk card image.
export async function GET(req) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return new Response("Not configured", { status: 500 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("Missing id", { status: 400 });

  const sb = supabaseAdmin();
  const { data, error } = await sb.from("walking_paths").select("points").eq("id", id).eq("status", "published").single();
  if (error || !data || !Array.isArray(data.points) || data.points.length < 2) return new Response("Not found", { status: 404 });

  const pts = data.points.filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number").slice(0, 40);
  if (pts.length < 2) return new Response("Not enough points", { status: 404 });

  const enc = pts.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|");
  const start = pts[0], end = pts[pts.length - 1];
  const url =
    `https://maps.googleapis.com/maps/api/staticmap?size=600x300&scale=2&maptype=roadmap` +
    `&path=color:0xE06A63FF|weight:4|${enc}` +
    `&markers=size:mid|color:0xE06A63|label:A|${start.lat},${start.lng}` +
    `&markers=size:mid|color:0x15539A|label:B|${end.lat},${end.lng}` +
    `&key=${key}`;

  try {
    const r = await fetch(url);
    if (!r.ok) return new Response("Map unavailable", { status: r.status });
    const buf = await r.arrayBuffer();
    return new Response(buf, { status: 200, headers: { "Content-Type": r.headers.get("content-type") || "image/png", "Cache-Control": "public, max-age=86400" } });
  } catch {
    return new Response("Map fetch failed", { status: 502 });
  }
}
