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

// Classic Places API (Text Search) — matches the "Places API" the key already allows.
async function enrich(cand, key) {
  const query = `${cand.name} San Miguel de Allende Guanajuato`;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=mx&key=${key}`;
  const resp = await fetch(url);
  if (!resp.ok) return { cand, matched: false, error: `Places HTTP ${resp.status}` };
  const data = await resp.json();
  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return { cand, matched: false, error: `Places: ${data.status}${data.error_message ? " — " + data.error_message : ""}` };
  }
  const p = data.results && data.results[0];
  if (!p) return { cand, matched: false };
  const loc = p.geometry && p.geometry.location ? { lat: p.geometry.location.lat, lng: p.geometry.location.lng } : null;
  const km = loc ? haversineKm(SMA, loc) : null;
  const address = p.formatted_address || "";
  const inArea = (km != null && km <= MAX_KM) || /San Miguel de Allende/i.test(address);
  const photoRef = p.photos && p.photos[0] && p.photos[0].photo_reference;
  return {
    cand, matched: true, inArea,
    placeId: p.place_id, name: p.name || cand.name,
    address, lat: loc && loc.lat, lng: loc && loc.lng,
    km: km != null ? Math.round(km * 10) / 10 : null,
    photoRef: photoRef || null,
  };
}

// Source list names -> cuisine facet keys (must match CUISINES in App.jsx).
const CUISINE_MAP = {
  "Best Mexican Food": ["mexican"], "Best Italian": ["italian"], "Best Pizza": ["italian"],
  "Best Asian": ["asian"], "Best Peruvian": ["peruvian"], "Best Argentinian": ["argentinian"],
  "Best sandwiches_burgers": ["burgers"], "Best breakfasts": ["breakfast"],
  "Cafe for working": ["cafe", "coworking"], "Best coffee": ["cafe"], "Best bakeries": ["bakery"], "Dessert": ["dessert"],
  "Date night restaurants": ["datenight"],
};
function cuisineOf(cand) {
  const lists = Array.isArray(cand.sourceList) ? cand.sourceList : [cand.sourceList].filter(Boolean);
  const set = new Set();
  lists.forEach((l) => (CUISINE_MAP[l] || []).forEach((c) => set.add(c)));
  return [...set];
}

function rowFrom(r) {
  const c = r.cand;
  const tags = c.inferredTags || [];
  return {
    status: "published", editorial: true,
    list_key: c.inferredListKey || "rest",
    name: r.name || c.name,
    desc_en: c.desc_en || null,
    desc_es: c.desc_es || null,
    category: c.inferredCategory || "mercados",
    audience: tags.filter((t) => t === "family" || t === "teens"),
    diet: tags.filter((t) => t === "vegetarian" || t === "vegan"),
    cuisine: cuisineOf(c),
    area: "San Miguel de Allende",
    lat: r.lat != null ? r.lat : null,
    lng: r.lng != null ? r.lng : null,
    google_place_id: r.placeId || null,
    source_ref: c.mapsUrl || null,
    photo_url: r.photoRef ? `/api/place-photo?ref=${encodeURIComponent(r.photoRef)}` : null,
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
    const seen = new Set();
    const fresh = [];
    for (const r of rows) {
      const pid = r.google_place_id || null;
      const nm = (r.name || "").toLowerCase();
      const sref = r.source_ref || null;
      if (pid && haveIds.has(pid)) continue;              // already in DB (by place id)
      if (nm && haveNames.has(nm)) continue;              // already in DB (by name)
      if (pid && seen.has("p:" + pid)) continue;          // dup within this batch
      if (sref && seen.has("s:" + sref)) continue;
      if (nm && seen.has("n:" + nm)) continue;
      if (pid) seen.add("p:" + pid);
      if (sref) seen.add("s:" + sref);
      if (nm) seen.add("n:" + nm);
      fresh.push(r);
    }
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
      photo: !!r.photoRef, error: r.error || null,
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
