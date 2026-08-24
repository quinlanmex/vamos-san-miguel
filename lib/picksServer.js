import { supabaseAdmin } from "./supabaseAdmin";

// Server-side access to the curated Local Picks (with their opinionated local_take), so the
// guide pages can name real places and quote the real take instead of writing generic prose.
const FIELDS = "id,name,list_key,area,cuisine,desc_en,local_take,ai_notes,photo_url,price_level,featured,featured_rank,priority,best_of,business_status";

export async function getPicks() {
  let sb;
  try { sb = supabaseAdmin(); } catch { return []; }
  const { data, error } = await sb.from("places").select(FIELDS).eq("status", "published").eq("editorial", true);
  if (error || !data) return [];
  return data.filter((p) => p.business_status !== "CLOSED_PERMANENTLY");
}

// The short opinionated line we show for a pick: prefer the hand-written local take.
export const takeOf = (p) => (p.local_take || p.ai_notes || p.desc_en || "").trim();

// Best picks of a given list_key (rest/bar/wellness/...), most-recommended first, that have a
// real local take to quote. cuisineAny optionally filters to picks tagged with any of those facets.
export function picksByType(picks, listKey, { limit = 3, cuisineAny = null } = {}) {
  return picks
    .filter((p) => p.list_key === listKey && takeOf(p))
    .filter((p) => !cuisineAny || (Array.isArray(p.cuisine) && cuisineAny.some((c) => p.cuisine.includes(c))))
    .sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5) || (a.featured_rank ?? 9999) - (b.featured_rank ?? 9999))
    .slice(0, limit);
}

// Picks carrying a given good-for / amenity facet (e.g. "views", "wellness", "coworking").
export function picksByFacet(picks, facet, limit = 3) {
  return picks
    .filter((p) => Array.isArray(p.cuisine) && p.cuisine.includes(facet) && takeOf(p))
    .sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5))
    .slice(0, limit);
}
