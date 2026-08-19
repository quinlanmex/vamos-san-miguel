import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

// Quick-add a single place by its Google place_id (from /api/place-autocomplete).
// Pulls Google Place Details and inserts a published, editorial pick with everything
// we can auto-fill: coords, photos, phone, website, hours, price, business status.
// Then a Haiku pass classifies cuisine / amenity / diet facets and writes a starter
// description (EN + ES) from those facts, so the new card is fully filled for review.
// Neighborhood + drive time still fill via the nightly crons (they key off coords).
const LIST_KEYS = ["rest", "bar", "wellness", "parks", "culture", "shopping"];

// Facet vocabularies (must match components/cuisines.jsx + the admin editor).
const CUISINE_KEYS = ["mexican", "mediterranean", "international", "italian", "asian", "peruvian", "argentinian", "burgers", "bbq", "breakfast", "cafe", "bakery", "dessert"];
const AMENITY_KEYS = ["coworking", "datenight", "groups", "livemusic", "family", "playground", "views", "vineyard"];
const DIET_KEYS = ["vegetarian", "vegan"];

const FIELDS = [
  "name", "geometry", "formatted_address", "photos", "editorial_summary",
  "website", "formatted_phone_number", "business_status", "opening_hours",
  "types", "price_level", "place_id", "reviews", "rating", "user_ratings_total",
  "serves_vegetarian_food", "serves_beer", "serves_wine", "reservable",
  "takeout", "delivery", "dine_in", "serves_breakfast", "serves_brunch",
].join(",");

async function details(placeId, key) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${FIELDS}&reviews_no_translations=true&region=mx&language=en&key=${key}`;
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (j.status !== "OK" || !j.result) return null;
  return j.result;
}

// Pull the visible text of the place's own website, to ground the description in real
// "about" copy rather than guesses. Best-effort; returns "" on any failure.
async function siteText(url) {
  if (!url || !/^https?:\/\//.test(url)) return "";
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36", "accept": "text/html" } });
    if (!r.ok) return "";
    const html = await r.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);
  } catch { return ""; }
}

// Best-effort classification + grounded description. Never throws; returns {} on any
// failure so the place still gets added with sensible fallbacks. The description is
// synthesized from real signal (Google reviews + the place's website), NOT invented.
async function classify(d, type, site) {
  if (!process.env.ANTHROPIC_API_KEY) return {};
  const reviewBlob = (Array.isArray(d.reviews) ? d.reviews : []).map((r) => (r.text || "")).join("\n---\n").slice(0, 5000);
  const facts = [
    `Name: ${d.name}`,
    `Editor's category for this listing: ${type}`,
    d.formatted_address ? `Address: ${d.formatted_address}` : "",
    d.editorial_summary?.overview ? `Google one-line summary: ${d.editorial_summary.overview}` : "",
    Array.isArray(d.types) && d.types.length ? `Google types: ${d.types.join(", ")}` : "",
    typeof d.price_level === "number" ? `Price level (0 cheap to 4 pricey): ${d.price_level}` : "",
    d.serves_vegetarian_food ? "Google flags: serves vegetarian food." : "",
    d.serves_beer || d.serves_wine ? "Google flags: serves beer/wine." : "",
    d.reservable ? "Google flags: takes reservations." : "",
    d.serves_breakfast || d.serves_brunch ? "Google flags: serves breakfast/brunch." : "",
  ].filter(Boolean).join("\n");

  const tool = {
    name: "classify_place",
    description: "Assign facets and write a grounded description for a San Miguel de Allende listing.",
    input_schema: {
      type: "object",
      properties: {
        cuisine: { type: "array", items: { type: "string", enum: CUISINE_KEYS }, description: "Food/drink styles actually supported by the evidence. Empty for non-food places." },
        amenities: { type: "array", items: { type: "string", enum: AMENITY_KEYS }, description: "Only ones clearly supported by the evidence." },
        diet: { type: "array", items: { type: "string", enum: DIET_KEYS } },
        desc_en: { type: "string", description: "One or two factual sentences grounded in the evidence." },
        desc_es: { type: "string", description: "Mexican Spanish translation of desc_en." },
        confidence: { type: "string", enum: ["high", "low"], description: "low if the evidence was too thin to describe the place specifically." },
      },
      required: ["cuisine", "amenities", "diet", "desc_en", "desc_es", "confidence"],
    },
  };

  const prompt = `You are cataloguing a place for a San Miguel de Allende local-picks guide. Write an ACCURATE description and pick facets, grounded ONLY in the evidence below. Getting this right matters more than sounding nice.

FACTS:
${facts}

REVIEW SIGNAL (synthesize what people actually say, do NOT quote verbatim):
${reviewBlob || "(none available)"}

WEBSITE TEXT (the place's own words):
${site || "(none available)"}

RULES:
- The description must be TRUE to this specific place. Base every claim on the review signal, website, or Google facts above. Do NOT invent cuisine, dishes, ambiance, or features that are not supported by the evidence.
- If the evidence is thin, write a SHORT, plainly factual description (for example "A cafe in Centro." or "A boutique and cafe in central San Miguel.") and set confidence to "low". Do not pad it with generic filler like "charming spot" or "thoughtfully prepared".
- cuisine: only styles the evidence supports (restaurants, cafes, bars, bakeries). Empty for spas, parks, galleries, shops.
- amenities: only ones clearly supported (e.g. "views" if rooftop/terrace is mentioned, "livemusic" if mentioned, "playground"/"family" for kid places, "vineyard" for a winery).
- diet: "vegetarian"/"vegan" only if supported.
- desc_en: one or two sentences, specific and honest, no em-dashes or en-dashes (use commas, periods, or "and").
- desc_es: natural Mexican Spanish version of desc_en.
Call classify_place with your answer.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001", // batch/enrichment model
      max_tokens: 800,
      tools: [tool],
      tool_choice: { type: "tool", name: "classify_place" },
      messages: [{ role: "user", content: prompt }],
    });
    const block = (msg.content || []).find((b) => b.type === "tool_use" && b.name === "classify_place");
    if (!block || !block.input) return {};
    const inp = block.input;
    return {
      cuisine: (Array.isArray(inp.cuisine) ? inp.cuisine : []).filter((c) => CUISINE_KEYS.includes(c)),
      amenities: (Array.isArray(inp.amenities) ? inp.amenities : []).filter((c) => AMENITY_KEYS.includes(c)),
      diet: (Array.isArray(inp.diet) ? inp.diet : []).filter((c) => DIET_KEYS.includes(c)),
      desc_en: typeof inp.desc_en === "string" ? inp.desc_en.trim() : "",
      desc_es: typeof inp.desc_es === "string" ? inp.desc_es.trim() : "",
    };
  } catch {
    return {};
  }
}

export async function POST(req) {
  const { password, place_id, list_key } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return Response.json({ error: "GOOGLE_MAPS_API_KEY not configured" }, { status: 500 });
  if (!place_id) return Response.json({ error: "place_id required" }, { status: 400 });

  const type = LIST_KEYS.includes(list_key) ? list_key : "rest";
  const sb = supabaseAdmin();

  const d = await details(place_id, key);
  if (!d) return Response.json({ ok: false, error: "Could not load details from Google" }, { status: 502 });

  const name = (d.name || "").trim();
  if (!name) return Response.json({ ok: false, error: "Google returned no name" }, { status: 502 });

  // Don't duplicate: match on google_place_id first, then on name (compared in JS so
  // names with commas/parentheses can't break a PostgREST filter).
  let dup = null;
  const { data: byId } = await sb.from("places").select("id, name").eq("google_place_id", place_id).limit(1);
  if (byId && byId.length) dup = byId[0];
  if (!dup) {
    const { data: all } = await sb.from("places").select("id, name");
    const nl = name.toLowerCase();
    dup = (all || []).find((x) => (x.name || "").toLowerCase().trim() === nl) || null;
  }
  if (dup) {
    return Response.json({ ok: false, duplicate: true, id: dup.id, name: dup.name, error: `"${dup.name}" is already in your list.` });
  }

  const loc = d.geometry && d.geometry.location;
  const photoObjs = (d.photos || []).slice(0, 4).filter((p) => p && p.photo_reference);
  const photos = photoObjs.map((p) => `/api/place-photo?ref=${encodeURIComponent(p.photo_reference)}`);
  // Google requires displaying each photo's attribution; store it aligned with photos[].
  const photoAttributions = photoObjs.map((p) => (Array.isArray(p.html_attributions) ? p.html_attributions.join(" ") : ""));
  const hoursText = d.opening_hours && Array.isArray(d.opening_hours.weekday_text)
    ? d.opening_hours.weekday_text.join("\n")
    : null;

  const site = await siteText(d.website);
  const c = await classify(d, type, site);
  // cuisine array holds cuisine + amenity facets together (matches the admin editor).
  const cuisine = [...new Set([...(c.cuisine || []), ...(c.amenities || [])])];
  const diet = c.diet || [];
  // Google explicitly flags vegetarian: make sure that facet is present.
  if (d.serves_vegetarian_food && !diet.includes("vegetarian")) diet.push("vegetarian");
  const descEn = c.desc_en || (d.editorial_summary && d.editorial_summary.overview) || null;

  const row = {
    status: "published",
    editorial: true,
    list_key: type,
    name,
    desc_en: descEn,
    desc_es: c.desc_es || null,
    audience: [], diet, cuisine,
    lat: loc ? loc.lat : null,
    lng: loc ? loc.lng : null,
    google_place_id: d.place_id || place_id,
    photo_url: photos[0] || null,
    photos,
    photo_attributions: photoAttributions,
    phone: d.formatted_phone_number || null,
    origin_url: d.website || null,
    hours: hoursText,
    price_level: typeof d.price_level === "number" ? d.price_level : null,
    business_status: d.business_status || null,
    // area (neighborhood) intentionally left null: computed automatically from coords.
  };

  const { data, error } = await sb.from("places").insert(row).select("id, name, list_key, lat, lng, photo_url").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({
    ok: true,
    place: data,
    hadPhoto: !!row.photo_url,
    hadDesc: !!row.desc_en,
    cuisine: cuisine.length,
    diet: diet.length,
  });
}
