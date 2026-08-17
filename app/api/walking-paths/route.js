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

export async function GET(req) {
  const sb = supabaseAdmin();
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const { data, error } = await sb.from("walking_paths").select("id,name,author,summary,points,created_at").eq("id", id).eq("status", "published").single();
    if (error || !data) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    return Response.json({ ok: true, path: data });
  }
  const { data, error } = await sb.from("walking_paths").select("id,name,author,summary,points,created_at").eq("status", "published").order("created_at", { ascending: false }).limit(200);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, paths: data || [] });
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
    status: "published",
  };
  const { data, error } = await sb.from("walking_paths").insert(row).select("id,name,author,summary,points,created_at").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, path: data });
}
