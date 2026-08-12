import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import updates from "../../../data/pending-updates.json";

export const runtime = "nodejs";
export const maxDuration = 60;

// Applies the reviewed cuisine + good-for tags (data/pending-updates.json) to matching
// picks, so the owner never has to paste SQL for data changes. Cuisine column only.
export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let sb;
  try { sb = supabaseAdmin(); } catch (e) { return Response.json({ error: String(e.message || e) }, { status: 500 }); }

  const now = new Date().toISOString();
  let applied = 0, firstError = null;
  const notFound = [];
  for (const u of updates) {
    const { data, error } = await sb.from("places")
      .update({ cuisine: u.cuisine, updated_at: now })
      .eq("source_ref", u.source_ref)
      .select("id");
    if (error) { if (!firstError) firstError = error.message; continue; }
    if (!data || !data.length) notFound.push(u.source_ref);
    else applied += data.length;
  }
  return Response.json({ ok: true, total: updates.length, applied, notFound: notFound.length, error: firstError }, { status: firstError ? 500 : 200 });
}
