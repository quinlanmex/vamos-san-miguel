import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

// Admin review queue for scanned photos. POST { password, action, ... }.
export async function POST(req) {
  const { password, action, id, status } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const sb = supabaseAdmin();

  if (action === "list") {
    const st = ["pending", "approved", "rejected"].includes(status) ? status : "pending";
    const { data, error } = await sb.from("photo_candidates").select("id,url,caption,tags,source_file,status,created_at").eq("status", st).order("created_at", { ascending: false }).limit(500);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true, items: data || [] });
  }

  if (action === "approve") {
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    const { error } = await sb.from("photo_candidates").update({ status: "approved" }).eq("id", id);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (action === "reject") {
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    // Remove the stored file too, so rejected images don't linger.
    const { data: row } = await sb.from("photo_candidates").select("storage_path").eq("id", id).single();
    if (row && row.storage_path) await sb.storage.from("photos").remove([row.storage_path]);
    const { error } = await sb.from("photo_candidates").delete().eq("id", id);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
