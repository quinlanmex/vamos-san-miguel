import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import updates from "../../../data/pending-updates.json";

export const runtime = "nodejs";
export const maxDuration = 60;

// Applies the reviewed cuisine + good-for tags (data/pending-updates.json) to matching
// picks, so the owner never has to paste SQL for data changes. Cuisine column only.
// ADDITIVE: unions the reviewed tags with whatever the pick already has, so manual
// tagging is never removed.
export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let sb;
  try { sb = supabaseAdmin(); } catch (e) { return Response.json({ error: String(e.message || e) }, { status: 500 }); }

  const refs = updates.map((u) => u.source_ref);
  const { data: existing, error: selErr } = await sb.from("places").select("id, source_ref, cuisine").in("source_ref", refs);
  if (selErr) return Response.json({ error: selErr.message }, { status: 500 });
  const byRef = new Map((existing || []).map((r) => [r.source_ref, r]));

  const now = new Date().toISOString();
  let applied = 0, added = 0, firstError = null, notFound = 0;
  for (const u of updates) {
    const row = byRef.get(u.source_ref);
    if (!row) { notFound++; continue; }
    const before = row.cuisine || [];
    const merged = [...new Set([...before, ...u.cuisine])];
    if (merged.length === before.length) { applied++; continue; } // nothing new to add
    const { error } = await sb.from("places").update({ cuisine: merged, updated_at: now }).eq("id", row.id);
    if (error) { if (!firstError) firstError = error.message; continue; }
    applied++; added += merged.length - before.length;
  }
  return Response.json({ ok: true, total: updates.length, applied, added, notFound, error: firstError }, { status: firstError ? 500 : 200 });
}
