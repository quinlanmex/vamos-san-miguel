import { createClient } from "@supabase/supabase-js";

// Base project URL + publishable (anon) key. If missing, the app falls back
// to its built-in seed data so the preview always renders.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

const bi = (en, es) => ({ en, es });

/* DB row -> the shape the app's components expect. */
export function mapEvent(r) {
  return {
    id: r.id,
    cat: r.category,
    start: r.start_date,
    end: r.end_date,
    time: r.start_time ? String(r.start_time).slice(0, 5) : null,
    recurring: !!r.recurring,
    title: bi(r.title_en, r.title_es),
    blurb: bi(r.blurb_en, r.blurb_es),
    price: bi(r.price_en, r.price_es),
    venue: r.venue,
    area: r.area,
    lat: r.lat,
    lng: r.lng,
    audience: r.audience || [],
    origin: r.origin_name ? { name: r.origin_name, url: r.origin_url || undefined } : undefined,
    img: r.photo_url || undefined,
    src: r.discovered_via || undefined,
  };
}

/* Local Picks are grouped into named lists for display. Titles live here for
 * now; promote to a `place_lists` table when the admin can manage them. */
const LIST_META = {
  rest: { es: "Restaurantes favoritos", en: "Favorite restaurants", cat: "mercados" },
  bar:  { es: "Mejores bares", en: "Best bars", cat: "musica" },
  live: { es: "Música en vivo", en: "Live music", cat: "musica" },
};
const LIST_ORDER = ["rest", "bar", "live"];

export function mapPlace(r) {
  return {
    name: r.name,
    area: r.area,
    en: r.desc_en,
    es: r.desc_es,
    cat: r.category,
    audience: r.audience || [],
    diet: r.diet || [],
    cuisine: r.cuisine || [],
    img: r.photo_url || undefined,
    photos: r.photos || [],
    list_key: r.list_key,
    website: r.origin_url || undefined,
    phone: r.phone || undefined,
    hours: r.hours || undefined,
    price: r.price_level || undefined,
    tip: r.tip || undefined,
    featured: !!r.featured,
    featured_rank: r.featured_rank != null ? r.featured_rank : 9999,
    mapsUrl: r.source_ref || undefined,
    lat: r.lat,
    lng: r.lng,
    centro_min: r.centro_min != null ? r.centro_min : null,
    hoursJson: r.hours_json || null,   // { weekday_text, periods } from Google Places
    attrs: r.place_attrs || null,      // practical attributes (reservations, veg, etc.)
    whyLove: r.why_love || null,       // editorial: why we love it
    whatToOrder: r.what_to_order || null, // editorial: what to order / don't miss
    bestTime: r.best_time || null,     // editorial: best time to go
  };
}

export function groupPlaces(rows) {
  const byKey = {};
  rows.map(mapPlace).forEach((p) => {
    const k = p.list_key || "rest";
    (byKey[k] ||= []).push(p);
  });
  return LIST_ORDER.filter((k) => byKey[k]?.length).map((k) => ({
    key: k, es: LIST_META[k].es, en: LIST_META[k].en, cat: LIST_META[k].cat, items: byKey[k],
  }));
}

export async function fetchEvents() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("events").select("*").eq("status", "published");
  if (error) { console.warn("[supabase] events:", error.message); return null; }
  // Only surface events that haven't already happened. Recurring events always
  // show; dated ones show through their last day (end_date, or start_date if none).
  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
  return (data || []).map(mapEvent).filter((e) => {
    if (e.recurring) return true;
    const last = e.end || e.start;
    return !last || String(last).slice(0, 10) >= todayStr;
  });
}

export async function fetchPlaces() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("places").select("*").eq("status", "published").eq("editorial", true);
  if (error) { console.warn("[supabase] places:", error.message); return null; }
  // Hide anything Google reports as permanently closed. Since we don't archive it,
  // a place that reopens (business_status back to OPERATIONAL) reappears on its own.
  const open = (data || []).filter((r) => r.business_status !== "CLOSED_PERMANENTLY");
  return groupPlaces(open);
}
