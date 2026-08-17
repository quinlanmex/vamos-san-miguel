import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

// Merge near-duplicate events (e.g. three "Tianguis de los Martes" rows that differ only
// in punctuation) into a single listing. Groups by a normalized title, keeps the most
// complete row, marks it recurring if any duplicate was, and deletes the rest.
const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Higher = keep. Prefers rows with a photo, coords, blurb, a set priority, and recurring.
const score = (e) =>
  (e.photo_url ? 2 : 0) + (e.lat != null ? 1 : 0) + (e.blurb_en ? 1 : 0) + (e.priority ? 1 : 0) + (e.recurring ? 1 : 0);

export async function run() {
  const sb = supabaseAdmin();
  const { data: rows, error } = await sb.from("events").select("*");
  if (error) return { ok: false, error: error.message, status: 500 };

  const groups = new Map();
  for (const e of rows || []) {
    const k = norm(e.title_en);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }

  let merged = 0, deleted = 0;
  for (const [, list] of groups) {
    if (list.length < 2) continue;
    list.sort((a, b) => score(b) - score(a) || a.id - b.id);
    const keeper = list[0];
    const losers = list.slice(1);
    const anyRecurring = list.some((e) => e.recurring);
    // Fill a few obviously-missing fields on the keeper from the discarded rows.
    const patch = {};
    if (anyRecurring && !keeper.recurring) patch.recurring = true;
    if (!keeper.photo_url) { const w = losers.find((e) => e.photo_url); if (w) patch.photo_url = w.photo_url; }
    if (keeper.lat == null) { const w = losers.find((e) => e.lat != null); if (w) { patch.lat = w.lat; patch.lng = w.lng; } }
    if (keeper.priority == null) { const w = losers.find((e) => e.priority != null); if (w) patch.priority = w.priority; }
    if (Object.keys(patch).length) await sb.from("events").update(patch).eq("id", keeper.id);
    const ids = losers.map((e) => e.id);
    const { error: delErr } = await sb.from("events").delete().in("id", ids);
    if (delErr) return { ok: false, error: delErr.message, merged, deleted, status: 500 };
    merged++; deleted += ids.length;
  }
  return { ok: true, merged, deleted };
}

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.status || (r.ok ? 200 : 500) });
}
