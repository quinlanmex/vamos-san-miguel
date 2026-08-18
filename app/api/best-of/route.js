import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

// "Best of" rails for the AI-first home. Each category is an intent people arrive with
// (best rooftop, best tacos, best coffee...). Jeff crowns THE winner and up to 2 runners-up
// via the admin wizard. GET is public (published only); POST with an action is admin.
// Backed by public.best_of_categories + a places.best_of text[] mirror. See data/add-best-of.sql.

const CAT_COLS = "slug,label_en,label_es,blurb_en,blurb_es,winner_place_id,runner_up_ids,sort,status";
const PLACE_COLS = "id,name,list_key,area,photo_url,desc_en,local_take,lat,lng,priority";

// Turn the raw "schema cache" error into a clear instruction.
function friendly(msg) {
  if (/best_of_categories/.test(msg || "") && /schema cache|does not exist/i.test(msg || "")) {
    return "The best_of_categories table isn't set up yet. Run data/add-best-of.sql in Supabase, then try again.";
  }
  return msg;
}

// Fetch places for a set of ids, returned as a Map(id -> place) for quick lookup.
async function placesById(sb, ids) {
  const uniq = [...new Set((ids || []).filter(Boolean))];
  if (!uniq.length) return new Map();
  const { data } = await sb.from("places").select(PLACE_COLS).in("id", uniq);
  return new Map((data || []).map((p) => [p.id, p]));
}

// Resolve winner + runner place objects onto each category row, preserving runner order.
async function resolve(sb, rows) {
  const allIds = [];
  for (const r of rows) {
    if (r.winner_place_id) allIds.push(r.winner_place_id);
    for (const id of r.runner_up_ids || []) allIds.push(id);
  }
  const map = await placesById(sb, allIds);
  return rows.map((r) => ({
    slug: r.slug,
    label_en: r.label_en,
    label_es: r.label_es,
    blurb_en: r.blurb_en,
    blurb_es: r.blurb_es,
    sort: r.sort,
    status: r.status,
    winner: r.winner_place_id ? map.get(r.winner_place_id) || null : null,
    runners: (r.runner_up_ids || []).map((id) => map.get(id)).filter(Boolean),
  }));
}

export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("best_of_categories").select(CAT_COLS).eq("status", "published").order("sort", { ascending: true });
  if (error) return Response.json({ ok: false, error: friendly(error.message) }, { status: 500 });
  const categories = (await resolve(sb, data || [])).map(({ status, ...c }) => c);
  return Response.json({ ok: true, categories });
}

const SLUG_RE = /^[a-z][a-z0-9_]*$/;

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();
  const guard = () => body.password === process.env.ADMIN_PASSWORD;

  if (body.action === "list-admin") {
    if (!guard()) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await sb.from("best_of_categories").select(CAT_COLS).order("sort", { ascending: true });
    if (error) return Response.json({ ok: false, error: friendly(error.message) }, { status: 500 });
    return Response.json({ ok: true, categories: await resolve(sb, data || []) });
  }

  if (body.action === "set-winner") {
    if (!guard()) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!body.slug || !body.place_id) return Response.json({ error: "slug and place_id required" }, { status: 400 });
    const { error } = await sb.from("best_of_categories").update({ winner_place_id: body.place_id, updated_at: new Date().toISOString() }).eq("slug", body.slug);
    if (error) return Response.json({ ok: false, error: friendly(error.message) }, { status: 500 });
    // Mirror the win onto the place's best_of array (dedupe).
    const { data: place } = await sb.from("places").select("best_of").eq("id", body.place_id).single();
    const current = Array.isArray(place?.best_of) ? place.best_of : [];
    if (!current.includes(body.slug)) {
      await sb.from("places").update({ best_of: [...current, body.slug] }).eq("id", body.place_id);
    }
    return Response.json({ ok: true });
  }

  if (body.action === "set-runners") {
    if (!guard()) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!body.slug) return Response.json({ error: "slug required" }, { status: 400 });
    const ids = (Array.isArray(body.ids) ? body.ids : []).filter(Boolean).slice(0, 3);
    const { error } = await sb.from("best_of_categories").update({ runner_up_ids: ids, updated_at: new Date().toISOString() }).eq("slug", body.slug);
    if (error) return Response.json({ ok: false, error: friendly(error.message) }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (body.action === "upsert-category") {
    if (!guard()) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!SLUG_RE.test(slug)) return Response.json({ error: "slug must be lowercase snake_case (letters, digits, underscores)" }, { status: 400 });
    const label_en = typeof body.label_en === "string" ? body.label_en.trim() : "";
    if (!label_en) return Response.json({ error: "label_en required" }, { status: 400 });
    const row = {
      slug,
      label_en,
      label_es: typeof body.label_es === "string" ? body.label_es.trim() || null : null,
      blurb_en: typeof body.blurb_en === "string" ? body.blurb_en.trim() || null : null,
      blurb_es: typeof body.blurb_es === "string" ? body.blurb_es.trim() || null : null,
      sort: Number.isFinite(+body.sort) ? Math.round(+body.sort) : 100,
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb.from("best_of_categories").upsert(row, { onConflict: "slug" });
    if (error) return Response.json({ ok: false, error: friendly(error.message) }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (body.action === "delete-category") {
    if (!guard()) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!body.slug) return Response.json({ error: "slug required" }, { status: 400 });
    const { error } = await sb.from("best_of_categories").delete().eq("slug", body.slug);
    if (error) return Response.json({ ok: false, error: friendly(error.message) }, { status: 500 });
    return Response.json({ ok: true, deleted: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
