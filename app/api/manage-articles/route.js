import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

// Admin CRUD for the articles table: list rows and set each row's google_doc_id.
export async function POST(req) {
  const { password, action, slug, kind = "plan", google_doc_id } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let sb;
  try { sb = supabaseAdmin(); } catch (e) { return Response.json({ error: String(e.message || e) }, { status: 500 }); }

  if (action === "list") {
    const { data, error } = await sb
      .from("articles")
      .select("slug,kind,title,google_doc_id,synced_at,sort")
      .order("kind", { ascending: true })
      .order("sort", { ascending: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, articles: data || [] });
  }

  if (action === "setDocId") {
    if (!slug) return Response.json({ error: "slug required" }, { status: 400 });
    const id = (google_doc_id || "").trim() || null;
    const { error } = await sb.from("articles").update({ google_doc_id: id }).eq("kind", kind).eq("slug", slug);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
