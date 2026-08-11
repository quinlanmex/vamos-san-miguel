import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import candidates from "../../../data/picks-candidates.json";

export const runtime = "nodejs";
export const maxDuration = 60;

// San Miguel de Allende (Parroquia) — greater-SMA radius.
const SMA = { lat: 20.9153, lng: -100.7439 };
const MAX_KM = 32;

function haversineKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function enrich(cand, key) {
  const textQuery = `${cand.name} San Miguel de Allende Guanajuato`;
  const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.photos",
    },
    body: JSON.stringify({ textQuery, maxResultCount: 1, regionCode: "MX" }),
  });
  if (!resp.ok) return { cand, matched: false, error: `Places API ${resp.status}` };
  const data = await resp.json();
  const p = data.places && data.places[0];
  if (!p) return { cand, matched: false };
  const loc = p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null;
  const km = loc ? haversineKm(SMA, loc) : null;
  const address = p.formattedAddress || "";
  const inArea = (km != null && km <= MAX_KM) || /San Miguel de Allende/i.test(address);
  const photoName = p.photos && p.photos[0] && p.photos[0].name;
  return {
    cand, matched: true, inArea,
    placeId: p.id, name: (p.displayName && p.displayName.text) || cand.name,
    address, lat: loc && loc.lat, lng: loc && loc.lng,
    km: km != null ? Math.round(km * 10) / 10 : null,
    photoName: photoName || null,
  };
}

function rowFrom(r) {
  const c = r.cand;
  const tags = c.inferredTags || [];
  return {
    status: "published", editorial: true,
    list_key: c.inferredListKey || "rest",
    name: r.name || c.name,
    category: c.inferredCategory || "mercados",
    audience: tags.filter((t) => t === "family" || t === "teens"),
    diet: tags.filter((t) => t === "vegetarian" || t === "vegan"),
    area: "San Miguel de Allende",
    lat: r.lat != null ? r.lat : null,
    lng: r.lng != null ? r.lng : null,
    google_place_id: r.placeId || null,
    source_ref: Array.isArray(c.sourceList) ? c.sourceList.join(", ") : (c.sourceList || null),
    photo_url: r.photoName ? `/api/place-photo?ref=${encodeURIComponent(r.photoName)}` : null,
  };
}

const listOf = (c) => (Array.isArray(c.sourceList) ? c.sourceList.join(", ") : (c.sourceList || ""));

export async function POST(req) {
  const { password, mode = "dryrun", rows: submitted } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // COMMIT: insert exactly the rows the reviewer approved (skipping duplicates).
  if (mode === "commit") {
    const rows = Array.isArray(submitted) ? submitted : [];
    if (!rows.length) return Response.json({ mode: "commit", inserted: 0, skipped: 0 });
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("places").select("name,google_place_id");
    const haveIds = new Set((existing || []).map((x) => x.google_place_id).filter(Boolean));
    const haveNames = new Set((existing || []).map((x) => (x.name || "").toLowerCase()));
    const fresh = rows.filter((r) => !(r.google_place_id && haveIds.has(r.google_place_id)) && !haveNames.has((r.name || "").toLowerCase()));
    let inserted = 0, error = null;
    if (fresh.length) {
      const { data, error: e } = await sb.from("places").insert(fresh).select("id");
      if (e) error = e.message; else inserted = data.length;
    }
    return Response.json({ mode: "commit", inserted, skipped: rows.length - fresh.length, error });
  }

  // DRY RUN: enrich every candidate via Places, return reviewable items.
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return Response.json({ error: "GOOGLE_MAPS_API_KEY not configured on the server." }, { status: 500 });

  const list = candidates.inArea || [];
  const enriched = [];
  for (const cand of list) {
    try { enriched.push(await enrich(cand, key)); }
    catch (e) { enriched.push({ cand, matched: false, error: String((e && e.message) || e) }); }
  }
  const items = enriched.map((r) => {
    const importable = !!(r.matched && r.inArea);
    return {
      name: r.name || r.cand.name,
      list: listOf(r.cand),
      importable, matched: !!r.matched, inArea: !!r.inArea,
      address: r.address || null, km: r.km != null ? r.km : null,
      photo: !!r.photoName, error: r.error || null,
      row: importable ? rowFrom(r) : null,
    };
  });
  items.sort((a, b) => (a.list || "").localeCompare(b.list || "") || a.name.localeCompare(b.name));
  const errs = items.filter((i) => i.error);
  return Response.json({
    mode: "dryrun",
    total: list.length,
    willImport: items.filter((i) => i.importable).length,
    sampleError: errs.length ? errs[0].error : null,
    allErrored: errs.length === list.length,
    items,
  });
}
