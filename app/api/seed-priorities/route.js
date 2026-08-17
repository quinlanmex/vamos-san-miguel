import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import seed from "../../../data/priority-seed.json";

export const runtime = "nodejs";

// One-shot: set trip-planner priority on a curated list of iconic essentials.
// Only touches rows that don't already have a priority set, so it never
// overwrites a value Jeff picked by hand. Matches by name (case-insensitive,
// tolerant of accents / minor spelling).
const norm = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export async function POST(req) {
  const { password, force } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sb = supabaseAdmin();
  const { data: rows, error } = await sb.from("places").select("id, name, priority");
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const set = [];
  const skipped = [];
  const notFound = [];

  for (const entry of seed) {
    const target = norm(entry.name);
    // exact normalized match first, then a contains fallback
    let row = (rows || []).find((r) => norm(r.name) === target);
    if (!row) row = (rows || []).find((r) => norm(r.name).includes(target) || target.includes(norm(r.name)));
    if (!row) { notFound.push(entry.name); continue; }
    if (row.priority != null && !force) { skipped.push({ name: row.name, priority: row.priority }); continue; }

    const { error: upErr } = await sb.from("places").update({ priority: entry.priority }).eq("id", row.id);
    if (upErr) return Response.json({ ok: false, error: upErr.message, set }, { status: 500 });
    set.push({ name: row.name, priority: entry.priority });
  }

  return Response.json({ ok: true, set, skipped, notFound });
}
