import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

// Move every pick from one list_key (type) to another. Used to retire the old
// "Venues" (live) type into "Arts & Culture" (culture). Idempotent: re-running does
// nothing once no rows have the `from` type. Never touches any other field.
export async function POST(req) {
  const { password, from, to } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!from || !to) return Response.json({ error: "from and to required" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data, error } = await sb.from("places").update({ list_key: to }).eq("list_key", from).select("id,name");
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, moved: (data || []).length, names: (data || []).map((r) => r.name) });
}
