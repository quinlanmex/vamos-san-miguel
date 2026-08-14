// Canonical San Miguel de Allende colonia anchors, from OpenStreetMap neighbourhood
// nodes (a few edge ones nudged to match the official tourist map). Every in-town pick
// is assigned to its NEAREST anchor — deterministic, needs no API, and is computed live
// so labeling is automatic. A manually set neighborhood always overrides this.

export const NEIGHBORHOODS = [
  { name: "Centro",         lat: 20.91320, lng: -100.74380, color: "#E8907F" },
  { name: "San Antonio",    lat: 20.91008, lng: -100.75379, color: "#7FB6A6" },
  { name: "Guadiana",       lat: 20.90420, lng: -100.74760, color: "#8FA9D8" },
  { name: "San Rafael",     lat: 20.91794, lng: -100.75253, color: "#D9B36A" },
  { name: "Guadalupe",      lat: 20.92103, lng: -100.74673, color: "#B79BD0" },
  { name: "Independencia",  lat: 20.92535, lng: -100.75416, color: "#E0A2B6" },
  { name: "Santa Julia",    lat: 20.91849, lng: -100.75605, color: "#9DC6A0" },
  { name: "Olimpo",         lat: 20.91946, lng: -100.75976, color: "#C9A98C" },
  { name: "Nuevo Progreso", lat: 20.91687, lng: -100.75489, color: "#A8C1B0" },
  { name: "Balcones",       lat: 20.91674, lng: -100.73051, color: "#8CBBD1" },
  { name: "Atascadero",     lat: 20.91450, lng: -100.72500, color: "#C7A2C7" },
  { name: "El Paraíso",     lat: 20.90833, lng: -100.73424, color: "#E3B98A" },
  { name: "Valle del Maíz", lat: 20.90443, lng: -100.73490, color: "#D6C088" },
  { name: "Ojo de Agua",    lat: 20.90467, lng: -100.74254, color: "#9FB6D6" },
  { name: "Allende",        lat: 20.90076, lng: -100.74772, color: "#C9B07E" },
  { name: "La Lejona",      lat: 20.88950, lng: -100.75300, color: "#A6B98C" },
  { name: "Azteca",         lat: 20.91812, lng: -100.73939, color: "#D79FA0" },
  { name: "Mexiquito",      lat: 20.92570, lng: -100.74957, color: "#B7C08A" },
];

const CENTRO = { lat: 20.9143, lng: -100.7436 };
export const IN_TOWN_KM = 4;

export function kmBetween(aLat, aLng, bLat, bLng) {
  const R = 6371, toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
export const kmFromCentro = (lat, lng) => kmBetween(CENTRO.lat, CENTRO.lng, lat, lng);

// Nearest colonia to a point. Returns null when the point is out of town (a drive-time
// label makes more sense there).
export function nearestNeighborhood(lat, lng) {
  if (lat == null || lng == null) return null;
  if (kmFromCentro(lat, lng) >= IN_TOWN_KM) return null;
  let best = null, bestD = Infinity;
  for (const n of NEIGHBORHOODS) {
    const d = kmBetween(lat, lng, n.lat, n.lng);
    if (d < bestD) { bestD = d; best = n; }
  }
  return best ? best.name : null;
}
export function neighborhoodColor(name) {
  const n = NEIGHBORHOODS.find((x) => x.name === name);
  return n ? n.color : "#B9AE9C";
}

// --- Region geometry: Voronoi cells around the anchors --------------------------
// We tessellate a bounding box around town by nearest-anchor (a Voronoi diagram),
// so each colonia becomes a soft-filled region with clean borders. Cells are built by
// clipping the box with each perpendicular-bisector half-plane. Math is done in a local
// planar projection (lng scaled by cos(lat)) so bisectors look right on the map.

const LAT0 = 20.9143;
const KX = Math.cos((LAT0 * Math.PI) / 180); // lng -> x scale
const proj = (lat, lng) => [lng * KX, lat];
const unproj = ([x, y]) => [y, x / KX]; // -> [lat, lng]

// Bounding box (lat/lng) covering the in-town anchors with margin.
const BBOX = { latMin: 20.8830, latMax: 20.9330, lngMin: -100.7660, lngMax: -100.7180 };

function clipHalfPlane(poly, sx, sy, ox, oy) {
  // Keep the side closer to site S(sx,sy) than other O(ox,oy).
  // inside(p) = 2*(p . (O-S)) - (|O|^2 - |S|^2) <= 0
  const dx = ox - sx, dy = oy - sy;
  const c = (ox * ox + oy * oy) - (sx * sx + sy * sy);
  const f = (x, y) => 2 * (x * dx + y * dy) - c;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const fp = f(p[0], p[1]), fq = f(q[0], q[1]);
    if (fp <= 0) out.push(p);
    if ((fp < 0) !== (fq < 0)) {
      const t = fp / (fp - fq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}

// Returns [{ name, color, latlngs: [[lat,lng],...] }] — one convex cell per anchor.
export function neighborhoodRegions() {
  const box = [
    proj(BBOX.latMin, BBOX.lngMin), proj(BBOX.latMin, BBOX.lngMax),
    proj(BBOX.latMax, BBOX.lngMax), proj(BBOX.latMax, BBOX.lngMin),
  ];
  const sites = NEIGHBORHOODS.map((n) => ({ ...n, p: proj(n.lat, n.lng) }));
  const out = [];
  for (const s of sites) {
    let cell = box;
    for (const o of sites) {
      if (o === s) continue;
      cell = clipHalfPlane(cell, s.p[0], s.p[1], o.p[0], o.p[1]);
      if (!cell.length) break;
    }
    if (cell.length >= 3) out.push({ name: s.name, color: s.color, latlngs: cell.map(unproj) });
  }
  return out;
}
