import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

// Rename a pick (by exact current name). Only touches the name field.
export async function POST(req) {
  const { password, from, to } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!from || !to) return Response.json({ error: "from and to required" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data, error } = await sb.from("places").update({ name: to }).eq("name", from).select("id");
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, renamed: (data || []).length });
}
