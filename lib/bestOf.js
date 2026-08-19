import { supabaseAdmin } from "./supabaseAdmin";

// Server-side helpers for the best-of SEO pages. Reads the categories + resolves winner and
// runner-up place details in one round trip.
const PLACE_FIELDS = "id,name,list_key,area,photo_url,photos,desc_en,local_take,lat,lng,price_level,cuisine";

export const dbToUrlSlug = (dbSlug) => String(dbSlug || "").replace(/^best_/, "").replace(/_/g, "-");
export const urlToDbSlug = (urlSlug) => "best_" + String(urlSlug || "").replace(/-/g, "_");

export async function getBestOfCategories() {
  let sb;
  try { sb = supabaseAdmin(); } catch { return []; }
  const { data: cats, error } = await sb
    .from("best_of_categories")
    .select("slug,label_en,label_es,blurb_en,blurb_es,winner_place_id,runner_up_ids,sort")
    .eq("status", "published")
    .order("sort", { ascending: true });
  if (error || !cats) return [];

  const ids = new Set();
  cats.forEach((c) => { if (c.winner_place_id) ids.add(c.winner_place_id); (c.runner_up_ids || []).forEach((id) => id && ids.add(id)); });
  let byId = new Map();
  if (ids.size) {
    const { data: places } = await sb.from("places").select(PLACE_FIELDS).in("id", [...ids]);
    byId = new Map((places || []).map((p) => [p.id, p]));
  }
  return cats.map((c) => ({
    ...c,
    winner: c.winner_place_id ? byId.get(c.winner_place_id) || null : null,
    runners: (c.runner_up_ids || []).map((id) => byId.get(id)).filter(Boolean),
  }));
}

export async function getBestOfBySlug(dbSlug) {
  const cats = await getBestOfCategories();
  return cats.find((c) => c.slug === dbSlug) || null;
}
