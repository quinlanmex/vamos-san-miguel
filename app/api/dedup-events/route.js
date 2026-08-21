import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

// Merge near-duplicate events into one listing. Handles both punctuation-only variants and
// title variants of the same real event (e.g. "San Miguel Walking Tour" vs "San Miguel Walking
// Tour . Follow Me Tours", or "Historic Walking Tour . Patronato Pro Ninos" vs "Historic Walking
// Tours of San Miguel"). Keeps the version with a real upcoming date, marks it recurring if any
// duplicate was, carries over the schedule/photo, and deletes the rest.
const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Generic/location words that don't identify the event; dropped before comparing titles.
const STOP = new Set("of the a an and or in on to for with by at san miguel de allende mexico gto guanajuato presents present benefiting benefit pro sma".split(" "));
// Distinctive tokens of a title: normalized, singularized, stopwords removed.
const sigTokens = (title) => new Set(
  norm(title).split(" ").filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w))
    .filter((w) => w && !STOP.has(w))
);
// a is a subset of b, requiring a distinctive multi-word core (>= 3 tokens) so generic pairs
// like "walking tour" never collapse two different tours together.
const subsetOf = (a, b) => a.size >= 3 && [...a].every((x) => b.has(x));

const todayStr = () => new Date().toLocaleDateString("en-CA");
const futureDate = (e) => { const dt = e.end_date || e.start_date; return dt && dt >= todayStr(); };
// Higher = keep. Strongly prefers a real upcoming date, then a photo/coords/blurb/priority.
const score = (e) =>
  (futureDate(e) ? 5 : 0) + (e.photo_url ? 2 : 0) + (e.lat != null ? 1 : 0) + (e.blurb_en ? 1 : 0) + (e.priority ? 1 : 0);

export async function run() {
  const sb = supabaseAdmin();
  const { data: rows, error } = await sb.from("events").select("*").eq("status", "published");
  if (error) return { ok: false, error: error.message, status: 500 };

  // Greedy grouping: an event joins a group when its distinctive tokens are a subset of the
  // group's (or vice versa) AND the category matches, so we never merge across categories.
  const items = (rows || []).map((e) => ({ e, s: sigTokens(e.title_en) })).filter((x) => x.s.size);
  const groups = [];
  for (const it of items) {
    const g = groups.find((g) => g.cat === it.e.category && (subsetOf(it.s, g.sig) || subsetOf(g.sig, it.s)));
    if (g) { g.list.push(it.e); if (it.s.size > g.sig.size) g.sig = it.s; }
    else groups.push({ cat: it.e.category, sig: it.s, list: [it.e] });
  }

  let merged = 0, deleted = 0;
  for (const g of groups) {
    const list = g.list;
    if (list.length < 2) continue;
    list.sort((a, b) => score(b) - score(a) || a.id - b.id);
    const keeper = list[0];
    const losers = list.slice(1);
    // Carry the union of useful info onto the keeper.
    const patch = {};
    if (list.some((e) => e.recurring) && !keeper.recurring) patch.recurring = true;
    if (!keeper.photo_url) { const w = losers.find((e) => e.photo_url); if (w) { patch.photo_url = w.photo_url; if (Array.isArray(w.photo_attributions)) patch.photo_attributions = w.photo_attributions; } }
    if (keeper.lat == null) { const w = losers.find((e) => e.lat != null); if (w) { patch.lat = w.lat; patch.lng = w.lng; } }
    if (keeper.priority == null) { const w = losers.find((e) => e.priority != null); if (w) patch.priority = w.priority; }
    if ((!Array.isArray(keeper.recur_days) || !keeper.recur_days.length)) { const w = losers.find((e) => Array.isArray(e.recur_days) && e.recur_days.length); if (w) patch.recur_days = w.recur_days; }
    if (!keeper.recur_note) { const w = losers.find((e) => e.recur_note); if (w) { patch.recur_note = w.recur_note; if (w.recur_note_es) patch.recur_note_es = w.recur_note_es; } }
    if (!keeper.start_time) { const w = losers.find((e) => e.start_time); if (w) patch.start_time = w.start_time; }
    if (Object.keys(patch).length) {
      let { error: uErr } = await sb.from("events").update(patch).eq("id", keeper.id);
      if (uErr && /recur_days|recur_note|photo_attributions/.test(uErr.message || "")) {
        const { recur_days, recur_note, recur_note_es, photo_attributions, ...safe } = patch;
        if (Object.keys(safe).length) await sb.from("events").update(safe).eq("id", keeper.id);
      }
    }
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
