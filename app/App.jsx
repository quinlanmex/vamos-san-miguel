"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  Heart, Search, MapPin, Clock, Ticket, Globe, Repeat, X,
  Music, Clapperboard, Footprints, Users, MessagesSquare, ShoppingBasket, Waves,
  Map as MapIcon, List as ListIcon, CalendarPlus, Share2, ExternalLink,
  Moon, Sun, Check, Baby, Backpack, Sprout, Salad,
  Utensils, Wine, Palette, Trees, Drama, ShoppingBag, Home, Sparkles,
  Images as ImageIcon, Phone, Clock3, DollarSign, Info, ChevronLeft, ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { nearestNeighborhood, neighborhoodRegions, kmFromCentro, kmBetween, IN_TOWN_KM } from "../lib/neighborhoods";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchEvents, fetchPlaces } from "../lib/supabase";
import { CUISINES, GOODFOR } from "../components/cuisines";

/* ------------------------------------------------------------------ *
 *  Qué Pasa · San Miguel  —  working-name prototype
 *  Palette: talavera cobalt + rosa mexicano + marigold on warm plaster
 *  Seeded with real events pulled during the source audit.
 * ------------------------------------------------------------------ */

/* ---- Theme palettes (light + dark) ------------------------------- */
/* Brand palette (finalized): navy-led structure, Parroquia coral signature accent,
 * marigold + bougainvillea accents, warm cream neutral. */
const PALETTES = {
  light: {
    plaster: "#F7F3EC", card: "#FFFFFF", ink: "#241C14", inkSoft: "#6E604F",
    cobalt: "#0D1B36", cobaltDeep: "#0A1428", coral: "#E06A63", rosa: "#E11D74", marigold: "#F2B134",
    line: "#E7DDCB", chipBg: "#FFFFFF", sheet: "#FFFFFF", scrim: "rgba(13,20,40,.42)",
  },
  dark: {
    plaster: "#12131A", card: "#1B1D27", ink: "#F4ECDD", inkSoft: "#A6A08F",
    cobalt: "#7FA8DA", cobaltDeep: "#0A1428", coral: "#E9887F", rosa: "#F0459A", marigold: "#F2B134",
    line: "#2C2F3B", chipBg: "#1B1D27", sheet: "#171922", scrim: "rgba(0,0,0,.62)",
  },
};

const CATS = {
  musica:    { es: "Música",    en: "Music",     c: "#E11D74", Icon: Music },
  cine:      { es: "Cine",      en: "Film",      c: "#15539A", Icon: Clapperboard },
  tours:     { es: "Tours",     en: "Tours",     c: "#2F7A63", Icon: Footprints },
  comunidad: { es: "Comunidad", en: "Community", c: "#F2A100", Icon: Users },
  charlas:   { es: "Charlas",   en: "Talks",     c: "#7A4F9E", Icon: MessagesSquare },
  mercados:  { es: "Mercados",  en: "Markets",   c: "#C6552E", Icon: ShoppingBasket },
  bienestar: { es: "Bienestar", en: "Wellness",  c: "#0E8C8C", Icon: Waves },
};

/* Audience facet — orthogonal to category (an event can be "Music" AND "Family"). */
const AUDIENCES = {
  family: { es: "Familias", en: "Family", Icon: Baby },
  teens:  { es: "Jóvenes",  en: "Teens",  Icon: Backpack },
};

/* Dietary facet — meaningful for food places (Local Picks). */
const DIET = {
  vegetarian: { es: "Vegetariano", en: "Vegetarian", Icon: Salad },
  vegan:      { es: "Vegano",      en: "Vegan",      Icon: Sprout },
};

/* Cuisine facet (CUISINES) is imported from ../components/cuisines and shared with the admin. */

/* Top-level Local Picks type facets, in display order (Restaurants first). */
const TYPE_ORDER = ["rest", "bar", "wellness", "parks", "culture", "shopping"];
const TYPE_LABEL_PLURAL = {
  rest: { en: "Restaurants & Cafés", es: "Restaurantes y cafés" },
  bar:  { en: "Bars",               es: "Bares" },
  wellness: { en: "Wellness & Spas", es: "Bienestar y spas" },
  parks:    { en: "Parks & Outdoors", es: "Parques y aire libre" },
  culture:  { en: "Arts & Culture",  es: "Arte y cultura" },
  shopping: { en: "Shopping",        es: "Compras" },
};
// Types that have "good for" facets (family/playground/views) but no cuisine sub-filter.
const EXPERIENTIAL_TYPES = ["wellness", "parks", "culture", "shopping"];

/* Seed / offline fallback — the app loads live data from Supabase and only
 * uses these if the fetch is unavailable or empty.
 * `src` is the internal "discovered-via" aggregator — never shown in the UI.
 * `origin` is the real source (venue/organizer) we attribute + link to. */
const SEED_EVENTS = [
  { id: 1, cat: "musica", start: "2026-07-30", end: "2026-07-30", time: "14:00",
    title: { es: "Ricardo Salinas: La Guitarra va al Cine", en: "Ricardo Salinas: The Guitar Goes to the Movies" },
    venue: "Sala Quetzal · La Biblioteca", area: "Centro", src: "Biblioteca", lat: 20.9166, lng: -100.7445,
    origin: { name: "La Biblioteca", url: "https://labibliotecapublica.org" },
    price: { es: "$330 MXN", en: "$330 MXN" },
    blurb: { es: "El maestro Ricardo Salinas rinde homenaje a bandas sonoras del cine en su guitarra clásica.",
             en: "Maestro Ricardo Salinas pays tribute to iconic film scores on classical guitar." } },
  { id: 2, cat: "mercados", start: "2026-07-28", end: "2026-08-02", time: "09:00",
    title: { es: "Feria Artesanal", en: "Artisan Craft Fair" },
    venue: "Jardín Principal", area: "Centro", src: "discoversma", lat: 20.9143, lng: -100.7436,
    price: { es: "Gratis", en: "Free" },
    blurb: { es: "Feria de artesanías en el corazón del Jardín, con artesanos de la región.",
             en: "Craft fair in the heart of the Jardín, with artisans from the region." } },
  { id: 3, cat: "cine", start: "2026-07-29", end: "2026-08-02", time: null,
    title: { es: "GIFF 2026 · Festival Internacional de Cine", en: "GIFF 2026 · International Film Festival" },
    venue: "Varias sedes", area: "Centro", src: "discoversma", lat: 20.9150, lng: -100.7444,
    origin: { name: "GIFF", url: "https://giff.mx" },
    price: { es: "Varía", en: "Varies" },
    blurb: { es: "El Festival Internacional de Cine de Guanajuato llega a San Miguel con funciones al aire libre.",
             en: "The Guanajuato International Film Festival comes to San Miguel with open-air screenings." } },
  { id: 4, cat: "charlas", start: "2026-07-29", end: "2026-07-29", time: "15:00",
    title: { es: "¿Puedo usar Medicare en México?", en: "Can I Use Medicare in Mexico?" },
    venue: "SMA Kindness Collective", area: "Centro", src: "discoversma", lat: 20.9158, lng: -100.7462,
    price: { es: "Gratis", en: "Free" },
    blurb: { es: "Charla informativa sobre el uso de Medicare para residentes extranjeros.",
             en: "An info talk on using Medicare as a foreign resident." } },
  { id: 5, cat: "charlas", start: "2026-07-29", end: "2026-07-29", time: "16:00",
    title: { es: "Cruzar el umbral: sobre el duelo", en: "Crossing the Threshold: On Grief" },
    venue: "Centro", area: "Centro", src: "discoversma", lat: 20.9150, lng: -100.7448,
    price: { es: "Gratis", en: "Free" },
    blurb: { es: "Una conversación sobre el duelo y por qué no podemos pensarlo para superarlo.",
             en: "A conversation on grief and why we can't think our way through it." } },
  { id: 6, cat: "tours", start: "2026-07-31", end: "2026-07-31", time: "09:45", recurring: true,
    title: { es: "Recorrido Histórico · Patronato Pro Niños", en: "Historic Walking Tour · Patronato Pro Niños" },
    venue: "El Jardín, frente a la Parroquia", area: "Centro", src: "discoversma", lat: 20.9140, lng: -100.7434,
    price: { es: "Donativo", en: "Donation" },
    blurb: { es: "Recorrido histórico a pie; lo recaudado apoya a Patronato Pro Niños.",
             en: "Historic walking tour; proceeds support Patronato Pro Niños." } },
  { id: 7, cat: "tours", start: "2026-07-30", end: "2026-07-30", time: "10:00", recurring: true,
    title: { es: "San Miguel Walking Tour · Follow Me Tours", en: "San Miguel Walking Tour · Follow Me Tours" },
    venue: "Starbucks del Jardín", area: "Centro", src: "discoversma", lat: 20.9146, lng: -100.7440,
    price: { es: "$500 MXN", en: "$500 MXN" },
    blurb: { es: "Recorrido a pie en grupo pequeño con guía bilingüe certificado.",
             en: "Small-group walking tour with a certified bilingual guide." } },
  { id: 8, cat: "tours", start: "2026-07-30", end: "2026-07-30", time: "10:00", recurring: true,
    title: { es: "Visita guiada · El Charco del Ingenio", en: "Guided Tour · El Charco del Ingenio" },
    venue: "El Charco del Ingenio", area: "Norte", src: "discoversma", lat: 20.9270, lng: -100.7295,
    origin: { name: "El Charco del Ingenio", url: "https://elcharco.org.mx" },
    price: { es: "$120 MXN", en: "$120 MXN" },
    blurb: { es: "Visita guiada por el jardín botánico y reserva natural.",
             en: "Guided tour of the botanical garden and nature reserve." } },
  { id: 9, cat: "comunidad", start: "2026-07-30", end: "2026-07-30", time: "10:00", recurring: true,
    title: { es: "¡Ven a pasear a los perritos!", en: "Come Walk the Dogs!" },
    venue: "Yo ❤ Animalitos SMA", area: "Centro", src: "discoversma", lat: 20.9118, lng: -100.7479,
    price: { es: "Gratis", en: "Free" },
    blurb: { es: "Pasea a los perritos del refugio; sin costo, todos bienvenidos.",
             en: "Walk the shelter dogs — free, and everyone's welcome." } },
  { id: 10, cat: "bienestar", start: "2026-07-30", end: "2026-07-30", time: "09:30", recurring: true,
    title: { es: "Aqua Fit", en: "Aqua Fit" },
    venue: "Astilleros Pool", area: "Centro", src: "discoversma", lat: 20.9105, lng: -100.7395,
    price: { es: "$150 MXN", en: "$150 MXN" },
    blurb: { es: "Clase de acondicionamiento en alberca, ideal para empezar el día.",
             en: "Pool fitness class — a great way to start the day." } },
  { id: 11, cat: "musica", start: "2026-08-08", end: "2026-08-08", time: "17:00",
    title: { es: "FASMA · Ensamble Tlapalli", en: "FASMA · Ensamble Tlapalli" },
    venue: "Bellas Artes", area: "Centro", src: "discoversma", lat: 20.9156, lng: -100.7451,
    price: { es: "$200 MXN", en: "$200 MXN" },
    blurb: { es: "Concierto del Ensamble Tlapalli dentro del festival de arte.",
             en: "Ensamble Tlapalli in concert as part of the arts festival." } },
  { id: 12, cat: "cine", start: "2026-07-28", end: "2026-08-02", time: null,
    title: { es: "Cartelera · Cine Bacco", en: "Now Showing · Cine Bacco" },
    venue: "Cine Bacco", area: "Centro", src: "discoversma", lat: 20.9135, lng: -100.7440,
    price: { es: "Varía", en: "Varies" },
    blurb: { es: "Cartelera semanal de cine de autor en Cine Bacco.",
             en: "This week's arthouse lineup at Cine Bacco." } },
];

// Who each event suits (family / teens). Anything untagged matches neither filter.
const EVENT_AUDIENCE = {
  1: ["family"], 2: ["family"], 3: ["family", "teens"], 6: ["family"],
  7: ["family", "teens"], 8: ["family", "teens"], 9: ["family", "teens"],
  10: ["family"], 11: ["family"], 12: ["teens"],
};
SEED_EVENTS.forEach((e) => { e.audience = EVENT_AUDIENCE[e.id] || []; });

// Sample photos (Lorem Picsum placeholders — real images arrive via ingestion).
// A few events are left imageless on purpose to show the gradient placeholder.
const EVENT_IMG = {
  1: "https://picsum.photos/seed/qp-salinas/640/420",
  2: "https://picsum.photos/seed/qp-feria/640/420",
  3: "https://picsum.photos/seed/qp-giff/640/420",
  7: "https://picsum.photos/seed/qp-tour/640/420",
  8: "https://picsum.photos/seed/qp-charco/640/420",
  11: "https://picsum.photos/seed/qp-fasma/640/420",
};
SEED_EVENTS.forEach((e) => { e.img = EVENT_IMG[e.id]; });

// Sample curated favorites — replaced later by your real Google Maps lists.
const SEED_FAV_LISTS = [
  { key: "rest", es: "Restaurantes favoritos", en: "Favorite restaurants", cat: "mercados",
    items: [
      { name: "La Parada", area: "Centro", es: "Peruano, patio encantador", en: "Peruvian, lovely courtyard" },
      { name: "Lavanda Café", area: "Centro", es: "Desayunos y café de especialidad", en: "Breakfast & specialty coffee" },
      { name: "Café Rama", area: "Centro", es: "Brunch creativo", en: "Creative brunch" },
    ] },
  { key: "bar", es: "Mejores bares", en: "Best bars", cat: "musica",
    items: [
      { name: "La Mezcalería", area: "Centro", es: "Mezcales y coctelería", en: "Mezcal & cocktails" },
      { name: "El Manantial", area: "Centro", es: "Cantina histórica, tostadas de mariscos", en: "Historic cantina, seafood tostadas" },
    ] },
  { key: "live", es: "Música en vivo", en: "Live music", cat: "musica",
    items: [
      { name: "Mama Mía", area: "Centro", es: "Música en vivo en la terraza", en: "Live music on the rooftop" },
      { name: "Teatro Santa Ana", area: "Centro", es: "Conciertos y eventos culturales", en: "Concerts & cultural events" },
    ] },
];

// Audience tags for favorites (bars stay adult-only → no family/teens tag).
const FAV_AUDIENCE = {
  "La Parada": ["family"], "Lavanda Café": ["family", "teens"], "Café Rama": ["family", "teens"],
  "La Mezcalería": [], "El Manantial": [],
  "Mama Mía": ["teens"], "Teatro Santa Ana": ["family", "teens"],
};
SEED_FAV_LISTS.forEach((l) => l.items.forEach((it) => { it.audience = FAV_AUDIENCE[it.name] || []; it.cat = l.cat; }));

const FAV_IMG = {
  "La Parada": "https://picsum.photos/seed/qp-parada/400/400",
  "Lavanda Café": "https://picsum.photos/seed/qp-lavanda/400/400",
  "Mama Mía": "https://picsum.photos/seed/qp-mamamia/400/400",
};
SEED_FAV_LISTS.forEach((l) => l.items.forEach((it) => { it.img = FAV_IMG[it.name]; }));

// Dietary tags (food places only; bars/venues stay untagged).
const FAV_DIET = {
  "La Parada": ["vegetarian"],
  "Lavanda Café": ["vegetarian", "vegan"],
  "Café Rama": ["vegetarian", "vegan"],
};
SEED_FAV_LISTS.forEach((l) => l.items.forEach((it) => { it.diet = FAV_DIET[it.name] || []; }));

const T = {
  es: { brand: "Vamos", tagline: "El San Miguel de los que saben",
    events: "Agenda", faves: "Recomendados", savedTab: "Guardados", search: "Buscar eventos, lugares…",
    all: "Todos", today: "Hoy", weekend: "Fin de semana", week: "Esta semana",
    saved: "Guardados", clear: "Limpiar filtros", results: "resultados",
    savedEmpty: "Aún no guardas nada.", savedHint: "Toca el ♥ en cualquier evento o recomendación para guardarlo aquí.",
    savedEvents: "Eventos guardados", savedPlaces: "Lugares guardados",
    none: "No hay eventos con esos filtros.", noneHint: "Prueba quitar un filtro o buscar otra cosa.",
    source: "Fuente", recurs: "Se repite", savedTip: "Guardar",
    favNote: "Datos de muestra — se reemplazarán con tus listas de Google Maps.",
    footer: "Prototipo · datos de muestra. La personalización y el radio de 1–2 h llegan después.",
    dateThru: "al", listView: "Lista", mapView: "Mapa",
    todayHero: "hoy en San Miguel", weekendHero: "este fin de semana", seeToday: "Ver hoy",
    addCal: "Agregar al calendario", share: "Compartir", viewSource: "Ver la fuente",
    copied: "¡Enlace copiado!", details: "Detalles", allCats: "Todas las categorías",
    approxLoc: "Ubicación aproximada", back: "Volver" },
  en: { brand: "Vamos", tagline: "The insider's San Miguel de Allende",
    events: "What's On", faves: "Local Picks", savedTab: "Saved", search: "Search events, places…",
    all: "All", today: "Today", weekend: "Weekend", week: "This week",
    saved: "Saved", clear: "Clear filters", results: "results",
    savedEmpty: "Nothing saved yet.", savedHint: "Tap the ♥ on any event or pick to save it here.",
    savedEvents: "Saved events", savedPlaces: "Saved places",
    none: "No events match those filters.", noneHint: "Try removing a filter or searching for something else.",
    source: "Source", recurs: "Recurring", savedTip: "Save",
    favNote: "Sample data — these get replaced by your real Google Maps lists.",
    footer: "Prototype · sample data. Personalization and the 1–2 hr radius come later.",
    dateThru: "–", listView: "List", mapView: "Map",
    todayHero: "on today in San Miguel", weekendHero: "this weekend", seeToday: "See today",
    addCal: "Add to calendar", share: "Share", viewSource: "View source",
    copied: "Link copied!", details: "Details", allCats: "All categories",
    approxLoc: "Approximate location", back: "Back" },
};

const TODAY = new Date(2026, 6, 29); // Wed Jul 29 2026
const d = (s) => { const [y, m, day] = s.split("-").map(Number); return new Date(y, m - 1, day); };
const overlaps = (aS, aE, bS, bE) => aS <= bE && bS <= aE;
const WEEKEND_S = new Date(2026, 7, 1), WEEKEND_E = new Date(2026, 7, 2);
const WEEK_E = new Date(2026, 7, 5);

const MONTHS = {
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

/* ---- helpers ----------------------------------------------------- */
const pad = (n) => String(n).padStart(2, "0");

function gcalUrl(e, lang) {
  const [y, m, day] = e.start.split("-").map(Number);
  let dates;
  if (e.time) {
    const [hh, mm] = e.time.split(":").map(Number);
    const s = new Date(y, m - 1, day, hh, mm);
    const en = new Date(s.getTime() + 2 * 3600 * 1000);
    const f = (t) => `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}T${pad(t.getHours())}${pad(t.getMinutes())}00`;
    dates = `${f(s)}/${f(en)}`;
  } else {
    const [ey, em, ed] = e.end.split("-").map(Number);
    const endD = new Date(ey, em - 1, ed); endD.setDate(endD.getDate() + 1);
    const f = (t) => `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}`;
    dates = `${f(new Date(y, m - 1, day))}/${f(endD)}`;
  }
  const params = new URLSearchParams({
    action: "TEMPLATE", text: e.title[lang], dates,
    details: e.origin ? `${e.blurb[lang]}\n\n${e.origin.url}` : e.blurb[lang],
    location: `${e.venue}, San Miguel de Allende`,
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

function dateLabelFor(e, lang, t) {
  const sD = d(e.start), eD = d(e.end);
  const multi = e.start !== e.end;
  return multi
    ? `${sD.getDate()} ${MONTHS[lang][sD.getMonth()]} ${t.dateThru} ${eD.getDate()} ${MONTHS[lang][eD.getMonth()]}`
    : `${sD.getDate()} ${MONTHS[lang][sD.getMonth()]}`;
}

// Location label for picks. In-town spots show their colonia (assigned by nearest OSM
// anchor, computed live); out-of-town spots show an estimated drive time from the Jardín.
// A manually set area (anything that isn't blank/"San Miguel de Allende") always wins.
function isGenericArea(area) { return !area || /^san miguel(\s+de\s+allende)?$/i.test(area); }

function areaLabel(it, lang) {
  const area = (it.area || "").trim();
  if (!isGenericArea(area)) return area; // manual override
  if (it.lat != null && it.lng != null) {
    const km = kmFromCentro(it.lat, it.lng);
    if (km >= IN_TOWN_KM) {
      // Real driving time when we have it; otherwise a highway-speed estimate (marked ~).
      if (it.centro_min != null) return lang === "es" ? `${it.centro_min} min del Centro` : `${it.centro_min} min from Centro`;
      const min = Math.max(5, Math.round(km * 2.0));
      return lang === "es" ? `~${min} min del Centro` : `~${min} min from Centro`;
    }
    return nearestNeighborhood(it.lat, it.lng) || "Centro";
  }
  return "San Miguel de Allende";
}
// The colonia a pick belongs to (for map coloring/legend), respecting a manual override.
function neighborhoodOf(it) {
  const area = (it.area || "").trim();
  if (!isGenericArea(area)) return area;
  if (it.lat != null && it.lng != null) {
    if (kmFromCentro(it.lat, it.lng) >= IN_TOWN_KM) return "Countryside";
    return nearestNeighborhood(it.lat, it.lng) || "Centro";
  }
  return "Centro";
}

// Open-now status computed from Google Places periods, in San Miguel local time.
function openStatus(hoursJson, lang) {
  const periods = hoursJson && hoursJson.periods;
  if (!periods || !periods.length) return null;
  if (periods.length === 1 && periods[0].open && !periods[0].close && periods[0].open.time === "0000")
    return { open: true, text: lang === "es" ? "Abierto 24 h" : "Open 24 hours" };
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.find((p) => p.type === "weekday").value];
    const cur = parseInt(parts.find((p) => p.type === "hour").value) * 60 + parseInt(parts.find((p) => p.type === "minute").value);
    const curMin = wd * 1440 + cur;
    for (const p of periods) {
      if (!p.open) continue;
      const openMin = p.open.day * 1440 + parseInt(p.open.time.slice(0, 2)) * 60 + parseInt(p.open.time.slice(2));
      let closeMin = p.close ? p.close.day * 1440 + parseInt(p.close.time.slice(0, 2)) * 60 + parseInt(p.close.time.slice(2)) : openMin + 1440;
      if (closeMin <= openMin) closeMin += 7 * 1440;
      if ((curMin >= openMin && curMin < closeMin) || (curMin + 7 * 1440 >= openMin && curMin + 7 * 1440 < closeMin))
        return { open: true, text: lang === "es" ? "Abierto ahora" : "Open now" };
    }
    return { open: false, text: lang === "es" ? "Cerrado ahora" : "Closed now" };
  } catch { return null; }
}
const ATTR_LABELS = {
  reservable: { en: "Reservations", es: "Reservaciones" },
  vegetarian: { en: "Vegetarian options", es: "Opciones vegetarianas" },
  wheelchair: { en: "Wheelchair accessible", es: "Accesible en silla" },
  beer: { en: "Beer", es: "Cerveza" },
  wine: { en: "Wine", es: "Vino" },
  takeout: { en: "Takeout", es: "Para llevar" },
  delivery: { en: "Delivery", es: "A domicilio" },
  dine_in: { en: "Dine-in", es: "Para comer aquí" },
};

const catIcon = (color) =>
  L.divIcon({
    className: "qp-pin",
    html: `<span style="display:block;width:20px;height:20px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);background:${color};border:2.5px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>`,
    iconSize: [20, 20], iconAnchor: [10, 20], popupAnchor: [0, -18],
  });

/* ---- Cuisine-colored pins (map) ----------------------------------- */
// Each cuisine/type gets its own color so restaurant types are identifiable even zoomed
// out. Neighborhoods are shown as soft regions instead (see PicksMap), not via pin color.
const CUISINE_COLOR = {
  mexican: "#D64545", italian: "#2F8F4E", asian: "#C7541F", peruvian: "#1E7FA8",
  argentinian: "#7A3E2E", mediterranean: "#1F9E89", international: "#5B6BB5",
  burgers: "#B4791F", breakfast: "#E0912F", cafe: "#8A5A2B", bakery: "#C77DAE",
  dessert: "#D6608A", bbq: "#8C3B2B",
};
const TYPE_COLOR = { rest: "#D64545", bar: "#7A3E9E", live: "#15539A" };
function pickColor(it) {
  const keys = it.list_key === "rest" ? (it.cuisine || []) : [];
  const primary = keys.find((c) => !GOODFOR.includes(c) && CUISINES[c]);
  if (primary && CUISINE_COLOR[primary]) return CUISINE_COLOR[primary];
  return TYPE_COLOR[it.list_key] || TYPE_COLOR.rest;
}
function pickIconComp(it) {
  const keys = it.list_key === "rest" ? (it.cuisine || []) : [];
  const primary = keys.find((c) => !GOODFOR.includes(c) && CUISINES[c]);
  return primary ? CUISINES[primary].Icon : (PLACE_TYPE[it.list_key] || PLACE_TYPE.rest).Icon;
}
// Cache rendered icon SVG markup so we don't re-serialize per marker per render.
const _glyphCache = {};
function pickGlyph(it) {
  const keys = it.list_key === "rest" ? (it.cuisine || []) : [];
  const primary = keys.find((c) => !GOODFOR.includes(c) && CUISINES[c]);
  const cacheKey = primary || `type:${it.list_key || "rest"}`;
  if (!_glyphCache[cacheKey]) {
    const Ic = pickIconComp(it);
    _glyphCache[cacheKey] = renderToStaticMarkup(<Ic size={15} color="#fff" strokeWidth={2.4} />);
  }
  return _glyphCache[cacheKey];
}
// Colored dot when zoomed out; a cuisine-icon pin when zoomed in — both colored by cuisine.
function placeMarkerIcon(it, zoomedIn) {
  const color = pickColor(it);
  if (!zoomedIn) return catIcon(color);
  return L.divIcon({
    className: "qp-cpin",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);background:${color};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)">
      <span style="transform:rotate(45deg);display:flex">${pickGlyph(it)}</span></span>`,
    iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28],
  });
}
// Legend entry (color + label) for a pick, by primary cuisine or type.
function pickLegendKey(it, lang) {
  const keys = it.list_key === "rest" ? (it.cuisine || []) : [];
  const primary = keys.find((c) => !GOODFOR.includes(c) && CUISINES[c]);
  if (primary && CUISINE_COLOR[primary]) return { key: primary, label: CUISINES[primary][lang], color: CUISINE_COLOR[primary] };
  const pt = PLACE_TYPE[it.list_key] || PLACE_TYPE.rest;
  return { key: it.list_key || "rest", label: pt[lang], color: TYPE_COLOR[it.list_key] || TYPE_COLOR.rest };
}
function ZoomWatch({ onZoom }) {
  const map = useMapEvents({ zoomend() { onZoom(map.getZoom()); } });
  return null;
}
const ICON_ZOOM = 16; // at/above this zoom, pins show cuisine icons

/* ---- AI trip planner ---------------------------------------------- */
const SLOT_LABEL = {
  morning: { en: "Morning", es: "Mañana" }, cafe: { en: "Coffee", es: "Café" },
  lunch: { en: "Lunch", es: "Comida" }, afternoon: { en: "Afternoon", es: "Tarde" },
  dinner: { en: "Dinner", es: "Cena" }, evening: { en: "Evening", es: "Noche" },
};
function TripPlanner({ onClose, stay, savedNames, lang, t, P, onOpenPick, onOpenEvent, onSaveAll }) {
  const es = lang === "es";
  const [days, setDays] = useState(3);
  const [party, setParty] = useState("couple");
  const [pace, setPace] = useState("balanced");
  const [interests, setInterests] = useState(() => new Set(["food", "art", "outdoors"]));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const LOAD_MSGS = es
    ? ["Explorando barrios…", "Emparejando tus lugares guardados…", "Agrupando por zona…", "Cronometrando las comidas…", "Añadiendo toques locales…"]
    : ["Scouting the neighborhoods…", "Pairing your saved spots…", "Clustering by area to save you steps…", "Timing your meals…", "Adding local touches…"];
  const [loadMsg, setLoadMsg] = useState(0);
  useEffect(() => { if (!loading) return; const id = setInterval(() => setLoadMsg((m) => (m + 1) % LOAD_MSGS.length), 1500); return () => clearInterval(id); }, [loading]);
  const [email, setEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [emailing, setEmailing] = useState(false);
  async function emailIt() {
    if (!email.trim()) return;
    setEmailing(true); setEmailMsg("");
    try {
      const r = await fetch("/api/email-itinerary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: email.trim(), itinerary: result, lang }) });
      const j = await r.json();
      setEmailMsg(j.ok ? (es ? "¡Enviado! Revisa tu correo." : "Sent! Check your inbox.") : (es ? "No se pudo enviar." : "Couldn't send it."));
    } catch { setEmailMsg(es ? "Error de red." : "Network error."); }
    setEmailing(false);
  }

  const PARTIES = [["couple", es ? "Pareja" : "Couple"], ["family with kids", es ? "Familia" : "Family"], ["friends", es ? "Amigos" : "Friends"], ["solo", es ? "Solo" : "Solo"]];
  const PACES = [["relaxed", es ? "Relajado" : "Relaxed"], ["balanced", es ? "Balanceado" : "Balanced"], ["packed", es ? "Intenso" : "Packed"]];
  const INTERESTS = [["food", es ? "Comida" : "Food"], ["cafes", es ? "Cafés" : "Cafés"], ["art", es ? "Arte" : "Art"], ["culture", es ? "Cultura" : "Culture"], ["outdoors", es ? "Aire libre" : "Outdoors"], ["nightlife", es ? "Vida nocturna" : "Nightlife"], ["wellness", es ? "Bienestar" : "Wellness"], ["shopping", es ? "Compras" : "Shopping"], ["family", es ? "Familia" : "Family"]];
  const toggleI = (k) => setInterests((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  async function generate() {
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await fetch("/api/plan-trip", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, party, pace, interests: [...interests], stay: stay || null, mustInclude: savedNames || [], lang }) });
      const j = await r.json();
      if (j.ok && j.days?.length) setResult(j);
      else setError(j.error || (es ? "No pudimos armar un plan. Intenta de nuevo." : "Couldn't build a plan. Try again."));
    } catch { setError(es ? "Error de red." : "Network error."); }
    setLoading(false);
  }

  const pill = (on, c) => ({ cursor: "pointer", border: `1px solid ${on ? c : P.line}`, background: on ? c : P.chipBg, color: on ? "#fff" : P.inkSoft, fontWeight: 600, fontSize: 13, padding: "6px 13px", borderRadius: 999 });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(13,20,40,.55)", display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto", padding: "24px 14px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: P.plaster, borderRadius: 20, maxWidth: 640, width: "100%", padding: "22px 20px 28px", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 className="disp" style={{ fontFamily: "Georgia, serif", fontSize: 23, margin: 0, color: P.ink }}>✨ {es ? "Arma mi viaje" : "Plan my trip"}</h2>
          <button onClick={onClose} style={{ border: "none", background: P.chipBg, cursor: "pointer", width: 34, height: 34, borderRadius: "50%", fontSize: 18, color: P.inkSoft }}>×</button>
        </div>
        <style>{`@keyframes qp-spin{to{transform:rotate(360deg)}}@keyframes qp-pulse{0%,100%{opacity:.5;transform:scale(.9)}50%{opacity:1;transform:scale(1.05)}}`}</style>

        {loading && (
          <div style={{ padding: "40px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 44, animation: "qp-pulse 1.4s ease-in-out infinite" }}>✨</div>
            <div style={{ margin: "18px auto 0", width: 34, height: 34, borderRadius: "50%", border: `3px solid ${P.line}`, borderTopColor: P.coral, animation: "qp-spin .8s linear infinite" }} />
            <p style={{ marginTop: 18, fontSize: 15, fontWeight: 700, color: P.ink }}>{LOAD_MSGS[loadMsg]}</p>
            <p style={{ marginTop: 4, fontSize: 12.5, color: P.inkSoft }}>{es ? "Suele tardar unos segundos." : "This usually takes a few seconds."}</p>
          </div>
        )}

        {!result && !loading && (
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <p style={label2(P)}>{es ? "Días" : "Days"}</p>
              <div style={{ display: "flex", gap: 7 }}>{[1, 2, 3, 4, 5].map((d) => <button key={d} onClick={() => setDays(d)} style={pill(days === d, P.cobalt)}>{d}</button>)}</div>
            </div>
            <div>
              <p style={label2(P)}>{es ? "¿Quién viaja?" : "Who's coming?"}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{PARTIES.map(([k, l]) => <button key={k} onClick={() => setParty(k)} style={pill(party === k, P.cobalt)}>{l}</button>)}</div>
            </div>
            <div>
              <p style={label2(P)}>{es ? "Ritmo" : "Pace"}</p>
              <div style={{ display: "flex", gap: 7 }}>{PACES.map(([k, l]) => <button key={k} onClick={() => setPace(k)} style={pill(pace === k, P.cobalt)}>{l}</button>)}</div>
            </div>
            <div>
              <p style={label2(P)}>{es ? "Intereses" : "Interests"}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{INTERESTS.map(([k, l]) => <button key={k} onClick={() => toggleI(k)} style={pill(interests.has(k), P.coral)}>{l}</button>)}</div>
            </div>
            {(savedNames?.length > 0 || stay) && (
              <p style={{ fontSize: 12.5, color: P.inkSoft, margin: 0 }}>
                {savedNames?.length > 0 && (es ? `Priorizaremos tus ${savedNames.length} guardados. ` : `We'll prioritize your ${savedNames.length} saved spots. `)}
                {stay && (es ? "Y lo armaremos alrededor de tu alojamiento." : "And build it around your stay.")}
              </p>
            )}
            {error && <p style={{ color: P.coral, fontSize: 13.5, margin: 0 }}>{error}</p>}
            <button onClick={generate} disabled={loading}
              style={{ border: "none", background: loading ? P.inkSoft : P.coral, color: "#fff", cursor: loading ? "default" : "pointer", fontWeight: 800, fontSize: 15.5, padding: "13px", borderRadius: 12 }}>
              {loading ? (es ? "Armando tu viaje…" : "Building your trip…") : (es ? "Generar itinerario" : "Generate itinerary")}
            </button>
          </div>
        )}

        {result && (
          <div>
            {result.summary && <p style={{ fontSize: 14.5, lineHeight: 1.55, color: P.ink, margin: "0 0 16px" }}>{result.summary}</p>}
            {result.days.map((d) => (
              <div key={d.day} style={{ marginBottom: 18 }}>
                <h3 className="disp" style={{ fontSize: 16, fontWeight: 800, color: P.ink, margin: "0 0 8px" }}>
                  {es ? `Día ${d.day}` : `Day ${d.day}`}{d.title ? ` · ${d.title}` : ""}
                </h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {d.items.map((it, i) => (
                    <button key={i} onClick={() => it.kind === "event" ? onOpenEvent(it.name) : onOpenPick(it.name)}
                      style={{ textAlign: "left", border: `1px solid ${P.line}`, background: P.card, borderRadius: 12, padding: "11px 13px", cursor: "pointer", display: "flex", gap: 11, alignItems: "flex-start" }}>
                      <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "#fff", background: it.kind === "event" ? P.cobalt : P.coral, padding: "3px 8px", borderRadius: 999, marginTop: 1 }}>
                        {(SLOT_LABEL[it.slot] || { en: it.slot, es: it.slot })[lang]}
                      </span>
                      <span>
                        <span style={{ fontWeight: 700, color: P.ink, fontSize: 14.5 }}>{it.name}</span>
                        {it.why && <span style={{ display: "block", fontSize: 13, color: P.inkSoft, lineHeight: 1.45, marginTop: 2 }}>{it.why}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <button onClick={() => onSaveAll(result, { days, party, pace, interests: [...interests], stay: stay || null, mustInclude: savedNames || [] })} style={{ border: "none", background: P.cobalt, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14, padding: "11px 18px", borderRadius: 11 }}>
                {es ? "Guardar itinerario" : "Save this itinerary"}
              </button>
              <button onClick={() => { setResult(null); }} style={{ border: `1px solid ${P.line}`, background: P.chipBg, cursor: "pointer", color: P.inkSoft, fontWeight: 700, fontSize: 14, padding: "11px 18px", borderRadius: 11 }}>
                {es ? "Ajustar" : "Tweak it"}
              </button>
            </div>
            {/* Email the itinerary to yourself to keep it */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${P.line}` }}>
              <p style={{ ...label2(P), margin: "0 0 6px" }}>{es ? "Envíatelo por correo" : "Email it to yourself"}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
                  onKeyDown={(e) => { if (e.key === "Enter") emailIt(); }}
                  placeholder={es ? "tu@correo.com" : "you@email.com"}
                  style={{ flex: 1, minWidth: 180, padding: "9px 12px", borderRadius: 10, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", background: P.card, color: P.ink }} />
                <button onClick={emailIt} disabled={emailing || !email.trim()}
                  style={{ border: "none", background: emailing || !email.trim() ? P.inkSoft : P.cobalt, color: "#fff", cursor: emailing ? "default" : "pointer", fontWeight: 700, fontSize: 14, padding: "9px 16px", borderRadius: 10 }}>
                  {emailing ? (es ? "Enviando…" : "Sending…") : (es ? "Enviar" : "Email me")}
                </button>
              </div>
              {emailMsg && <p style={{ fontSize: 12.5, color: emailMsg.includes("!") ? P.green : P.coral, margin: "6px 0 0" }}>{emailMsg}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
const label2 = (P) => ({ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: P.inkSoft, margin: "0 0 7px" });

// Saved itinerary shown as a day planner, with a chat to ask questions / tweak it in place.
function SavedItinerary({ itin, setItin, lang, t, P, onOpenPick, onOpenEvent }) {
  const es = lang === "es";
  const [messages, setMessages] = useState([]); // {role, content}
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState("");

  async function send() {
    const msg = input.trim(); if (!msg || busy) return;
    setInput(""); setBusy(true);
    const history = messages.slice(-8);
    setMessages((m) => [...m, { role: "user", content: msg }]);
    try {
      const r = await fetch("/api/plan-chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: itin, userMessage: msg, history, context: itin._ctx || {}, lang }) });
      const j = await r.json();
      if (j.ok) {
        setMessages((m) => [...m, { role: "assistant", content: j.reply || (es ? "Listo." : "Done.") }]);
        if (j.changed && j.itinerary?.days?.length) setItin({ ...j.itinerary, _ctx: itin._ctx });
      } else setMessages((m) => [...m, { role: "assistant", content: es ? "Perdón, no pude con eso." : "Sorry, I couldn't do that." }]);
    } catch { setMessages((m) => [...m, { role: "assistant", content: es ? "Error de red." : "Network error." }]); }
    setBusy(false);
  }
  async function emailIt() {
    if (!email.trim()) return; setEmailMsg("");
    try {
      const r = await fetch("/api/email-itinerary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: email.trim(), itinerary: itin, lang }) });
      const j = await r.json(); setEmailMsg(j.ok ? (es ? "¡Enviado!" : "Sent!") : (es ? "No se pudo." : "Couldn't send."));
    } catch { setEmailMsg(es ? "Error." : "Error."); }
  }

  return (
    <section style={{ marginBottom: 26, background: P.card, border: `1px solid ${P.line}`, borderRadius: 16, padding: "18px 18px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h2 className="disp" style={{ fontFamily: "Georgia, serif", fontSize: 20, margin: 0, color: P.ink }}>✨ {es ? "Tu itinerario" : "Your itinerary"}</h2>
        <button onClick={() => { setItin(null); }} style={{ border: `1px solid ${P.line}`, background: P.chipBg, cursor: "pointer", color: P.inkSoft, fontWeight: 600, fontSize: 12.5, padding: "5px 12px", borderRadius: 999 }}>{es ? "Borrar" : "Clear"}</button>
      </div>
      {itin.summary && <p style={{ fontSize: 14, lineHeight: 1.55, color: P.inkSoft, margin: "0 0 14px" }}>{itin.summary}</p>}
      {itin.days.map((d) => (
        <div key={d.day} style={{ marginBottom: 16 }}>
          <h3 className="disp" style={{ fontSize: 15.5, fontWeight: 800, color: P.ink, margin: "0 0 8px" }}>{es ? `Día ${d.day}` : `Day ${d.day}`}{d.title ? ` · ${d.title}` : ""}</h3>
          <div style={{ display: "grid", gap: 7 }}>
            {d.items.map((it, i) => (
              <button key={i} onClick={() => it.kind === "event" ? onOpenEvent(it.name) : onOpenPick(it.name)}
                style={{ textAlign: "left", border: `1px solid ${P.line}`, background: P.plaster, borderRadius: 10, padding: "9px 12px", cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "#fff", background: it.kind === "event" ? P.cobalt : P.coral, padding: "3px 7px", borderRadius: 999, marginTop: 1 }}>
                  {(SLOT_LABEL[it.slot] || { en: it.slot, es: it.slot })[lang]}
                </span>
                <span><span style={{ fontWeight: 700, color: P.ink, fontSize: 14 }}>{it.name}</span>
                  {it.why && <span style={{ display: "block", fontSize: 12.5, color: P.inkSoft, lineHeight: 1.4, marginTop: 1 }}>{it.why}</span>}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Chat to ask / tweak */}
      <div style={{ marginTop: 8, paddingTop: 14, borderTop: `1px dashed ${P.line}` }}>
        <p style={{ ...label2(P), margin: "0 0 8px" }}>{es ? "Pregunta o ajusta" : "Ask or tweak"}</p>
        {messages.length > 0 && (
          <div style={{ display: "grid", gap: 7, marginBottom: 10, maxHeight: 240, overflowY: "auto" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ justifySelf: m.role === "user" ? "end" : "start", maxWidth: "85%", fontSize: 13.5, lineHeight: 1.45, padding: "8px 12px", borderRadius: 12,
                background: m.role === "user" ? P.cobalt : P.chipBg, color: m.role === "user" ? "#fff" : P.ink, border: m.role === "user" ? "none" : `1px solid ${P.line}` }}>{m.content}</div>
            ))}
            {busy && <div style={{ justifySelf: "start", fontSize: 13, color: P.inkSoft, padding: "8px 12px" }}>{es ? "Pensando…" : "Thinking…"}</div>}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder={es ? "p. ej. haz el día 2 más relajado" : "e.g. make day 2 more relaxed"}
            style={{ flex: 1, padding: "10px 13px", borderRadius: 11, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", background: P.plaster, color: P.ink }} />
          <button onClick={send} disabled={busy || !input.trim()} style={{ border: "none", background: busy || !input.trim() ? P.inkSoft : P.coral, color: "#fff", cursor: busy ? "default" : "pointer", fontWeight: 700, fontSize: 14, padding: "10px 16px", borderRadius: 11 }}>{es ? "Enviar" : "Send"}</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={es ? "Envíatelo: tu@correo.com" : "Email it: you@email.com"} onKeyDown={(e) => { if (e.key === "Enter") emailIt(); }}
            style={{ flex: 1, minWidth: 170, padding: "8px 11px", borderRadius: 10, border: `1px solid ${P.line}`, fontSize: 13.5, fontFamily: "inherit", background: P.plaster, color: P.ink }} />
          <button onClick={emailIt} disabled={!email.trim()} style={{ border: `1px solid ${P.cobalt}`, background: P.chipBg, cursor: "pointer", color: P.cobalt, fontWeight: 700, fontSize: 13, padding: "8px 14px", borderRadius: 10 }}>{es ? "Enviar por correo" : "Email me"}</button>
          {emailMsg && <span style={{ fontSize: 12.5, color: emailMsg.includes("!") ? P.green : P.coral }}>{emailMsg}</span>}
        </div>
      </div>
    </section>
  );
}

// Desktop nav "Guides" dropdown — combines Plan / Move Here / The Book to de-crowd the bar.
function GuidesDropdown({ lang, P, tabStyle }) {
  const [open, setOpen] = useState(false);
  const items = [
    ["/plan", lang === "es" ? "Planea tu viaje" : "Plan your trip"],
    ["/move", lang === "es" ? "Mudarse aquí" : "Move Here"],
    ["/ebook", lang === "es" ? "El libro" : "The Book"],
  ];
  return (
    <div onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} style={{ position: "relative" }}>
      <button style={{ ...tabStyle, color: P.ink }}>{lang === "es" ? "Guías" : "Guides"} ▾</button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", background: "#fff", border: `1px solid ${P.line}`, borderRadius: 12, boxShadow: "0 10px 28px rgba(0,0,0,.14)", padding: 6, minWidth: 190, zIndex: 100 }}>
          {items.map(([href, label]) => (
            <a key={href} href={href} style={{ display: "block", padding: "9px 12px", color: P.ink, textDecoration: "none", fontSize: 14.5, fontWeight: 600, borderRadius: 8, whiteSpace: "nowrap" }}>{label}</a>
          ))}
        </div>
      )}
    </div>
  );
}

// Badge marking a saved item that arrived via a friend's shared link.
function SharedBadge({ lang, P }) {
  return (
    <span style={{ position: "absolute", top: 8, left: 8, zIndex: 5, display: "inline-flex", alignItems: "center", gap: 4,
      background: P.cobalt, color: "#fff", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em",
      padding: "3px 8px", borderRadius: 999, boxShadow: "0 2px 6px rgba(0,0,0,.25)" }}>
      <Share2 size={10} /> {lang === "es" ? "Compartido" : "Shared"}
    </span>
  );
}

/* ---- Brand emblem: a simplified Parroquia de San Miguel Arcángel — three
 * spires + rose window, SMA's signature landmark. White on the cobalt band. --- */
function Emblem({ size = 40 }) {
  // Production Parroquia emblem (traced vector): cream frame + coral spire, for the dark navy header band.
  return (
    <img src="/emblem-dark.svg" alt="" aria-hidden="true"
      style={{ height: size, width: "auto", display: "block", flexShrink: 0 }} />
  );
}

/* ---- Media: photo when available, category-gradient placeholder otherwise.
 * Real images arrive later via ingestion (og:image) + the Places API. --------- */
function Media({ img, cat, style, iconSize = 26 }) {
  const [err, setErr] = useState(false);
  const c = CATS[cat];
  if (img && !err) {
    return <img src={img} alt="" loading="lazy" onError={() => setErr(true)}
      style={{ objectFit: "cover", display: "block", ...style }} />;
  }
  const Ic = c.Icon;
  return (
    <div style={{ display: "grid", placeItems: "center", background: `linear-gradient(135deg, ${c.c}33, ${c.c}12)`, ...style }}>
      <Ic size={iconSize} color={c.c} style={{ opacity: 0.55 }} />
    </div>
  );
}

/* Personal saves persist on the visitor's device (no login) — Jeff's launch choice. */
const loadSet = (key) => {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); }
};

export default function App() {
  const [lang, setLang] = useState("en");
  const [theme, setTheme] = useState("light");
  const [view, setView] = useState("faves");
  const [eventLayout, setEventLayout] = useState("list"); // list | map
  const [picksLayout, setPicksLayout] = useState("list"); // list | map (Local Picks)
  const [savedLayout, setSavedLayout] = useState("list"); // list | map (Saved trip)
  const [expandedLists, setExpandedLists] = useState(() => new Set()); // per-list "show all" on the Picks home
  const [showPlanner, setShowPlanner] = useState(false); // AI trip planner modal
  const [savedItinerary, setSavedItinerary] = useState(() => { try { return JSON.parse(localStorage.getItem("qp_itinerary") || "null"); } catch { return null; } });
  useEffect(() => { try { savedItinerary ? localStorage.setItem("qp_itinerary", JSON.stringify(savedItinerary)) : localStorage.removeItem("qp_itinerary"); } catch {} }, [savedItinerary]);
  const [stay, setStay] = useState(null); // [lat, lng] — where the visitor is staying (device-stored)
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState(new Set());
  const [aud, setAud] = useState(new Set());
  const [favType, setFavType] = useState("");        // "" = all, or list_key: rest/bar/live
  const [favAud, setFavAud] = useState(new Set());
  const [favDiet, setFavDiet] = useState(new Set());
  const [favCuisine, setFavCuisine] = useState(new Set());
  const [dateF, setDateF] = useState("all");
  const [saved, setSaved] = useState(() => loadSet("qp_saved_events"));
  const [savedPlaces, setSavedPlaces] = useState(() => loadSet("qp_saved_places"));
  const [detail, setDetail] = useState(null); // event object or null
  const [placeDetail, setPlaceDetail] = useState(null); // pick object or null
  const [filterSheet, setFilterSheet] = useState(false); // mobile filter sheet
  const [events, setEvents] = useState(SEED_EVENTS);
  const [favLists, setFavLists] = useState(SEED_FAV_LISTS);
  const t = T[lang];
  const P = PALETTES[theme];

  useEffect(() => { localStorage.setItem("qp_saved_events", JSON.stringify([...saved])); }, [saved]);
  useEffect(() => { localStorage.setItem("qp_saved_places", JSON.stringify([...savedPlaces])); }, [savedPlaces]);

  // "Where you're staying" pin — stored on the device only.
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem("qp_stay") || "null"); if (Array.isArray(s) && s.length === 2) setStay(s); } catch {} }, []);
  useEffect(() => { try { stay ? localStorage.setItem("qp_stay", JSON.stringify(stay)) : localStorage.removeItem("qp_stay"); } catch {} }, [stay]);

  // Load live data from Supabase. Seed is ONLY an offline fallback (fetch failed → null);
  // once the live fetch succeeds we use it even if empty, so stale demo events never show.
  useEffect(() => {
    fetchEvents().then((d) => { if (d) setEvents(d); });
    fetchPlaces().then((d) => { if (d && d.length) setFavLists(d); });
  }, []);

  const toggle = (setFn, set, key) => {
    const n = new Set(set);
    n.has(key) ? n.delete(key) : n.add(key);
    setFn(n);
  };

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const s = d(e.start), en = d(e.end);
      // Hard future-only guard (belt and suspenders on top of the server filter):
      // one-time events must not have already ended. Recurring events always show.
      if (!e.recurring) {
        const last = d(e.end || e.start);
        if (last && !isNaN(last) && last < TODAY) return false;
      }
      if (cats.size && !cats.has(e.cat)) return false;
      if (aud.size && !e.audience.some((a) => aud.has(a))) return false;
      if (dateF === "today" && !overlaps(s, en, TODAY, TODAY)) return false;
      if (dateF === "weekend" && !overlaps(s, en, WEEKEND_S, WEEKEND_E)) return false;
      if (dateF === "week" && !overlaps(s, en, TODAY, WEEK_E)) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = (e.title[lang] + " " + e.venue + " " + e.blurb[lang]).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => d(a.start) - d(b.start));
  }, [events, cats, aud, dateF, query, lang]);

  const todayCount = useMemo(
    () => events.filter((e) => overlaps(d(e.start), d(e.end), TODAY, TODAY)).length, [events]);
  const weekendCount = useMemo(
    () => events.filter((e) => overlaps(d(e.start), d(e.end), WEEKEND_S, WEEKEND_E)).length, [events]);

  const anyFilter = cats.size || aud.size || dateF !== "all" || query.trim();

  // Cuisines are OR'd (show any selected cuisine); good-for + diet are AND'd (must-have).
  const selCuisines = [...favCuisine].filter((c) => !GOODFOR.includes(c));
  const selGoodfor = [...favCuisine].filter((c) => GOODFOR.includes(c));
  const favFiltered = favLists
    .filter((l) => !favType || l.key === favType)
    .map((l) => ({ ...l, items: l.items.filter((it) => {
      const cz = it.cuisine || [];
      const cuisineOK = !selCuisines.length || selCuisines.some((c) => cz.includes(c));
      const goodforOK = selGoodfor.every((g) => cz.includes(g));
      const dietOK = [...favDiet].every((d) => (it.diet || []).includes(d));
      const audOK = !favAud.size || (it.audience || []).some((a) => favAud.has(a));
      return cuisineOK && goodforOK && dietOK && audOK;
    }) }))
    .filter((l) => l.items.length);

  const shownCount = favFiltered.reduce((n, l) => n + l.items.length, 0);
  const favActive = favType !== "" || favCuisine.size > 0 || favDiet.size > 0;

  const savedEvents = useMemo(
    () => events.filter((e) => saved.has(e.id)).sort((a, b) => d(a.start) - d(b.start)), [saved, events]);
  const savedPlaceItems = useMemo(() => {
    const out = [];
    favLists.forEach((l) => l.items.forEach((it) => { if (savedPlaces.has(it.name)) out.push(it); }));
    return out;
  }, [savedPlaces, favLists]);
  const toggleSavePlace = (name) => toggle(setSavedPlaces, savedPlaces, name);

  // ---- Shareable itinerary: encode saved picks + events + stay into a URL ----
  const [sharedNames, setSharedNames] = useState(() => new Set());   // picks that arrived via a shared link
  const [sharedEventIds, setSharedEventIds] = useState(() => new Set());
  const [sharedNotice, setSharedNotice] = useState(null);            // { p, e } counts to announce
  const [shareMsg, setShareMsg] = useState("");
  const b64u = {
    enc: (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    dec: (s) => { try { return JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))))); } catch { return null; } },
  };
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      // Open a specific tab when linked from a content page (e.g. /?view=events).
      const v = params.get("view");
      if (v === "events" || v === "saved") { setView(v); window.history.replaceState({}, "", window.location.pathname); }
      if (params.get("planner")) { setShowPlanner(true); window.history.replaceState({}, "", window.location.pathname); }
      const p = params.get("trip");
      if (!p) return;
      const t = b64u.dec(p);
      if (t && (t.p?.length || t.e?.length || t.s)) {
        // Import immediately, mark them as "Shared", and take the visitor to Saved.
        if (t.p?.length) { setSavedPlaces((s) => new Set([...s, ...t.p])); setSharedNames(new Set(t.p)); }
        if (t.e?.length) { setSaved((s) => new Set([...s, ...t.e])); setSharedEventIds(new Set(t.e)); }
        if (t.s && !stay) setStay(t.s);
        setSharedNotice({ p: t.p?.length || 0, e: t.e?.length || 0 });
        setView("saved");
      }
      window.history.replaceState({}, "", window.location.pathname);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function shareTrip() {
    const payload = { p: [...savedPlaces], e: [...saved], ...(stay ? { s: stay } : {}) };
    const url = `${window.location.origin}/?trip=${b64u.enc(payload)}`;
    try {
      if (navigator.share) { await navigator.share({ title: "My San Miguel trip", url }); return; }
    } catch {}
    try { await navigator.clipboard.writeText(url); setShareMsg(lang === "es" ? "¡Enlace copiado!" : "Link copied!"); setTimeout(() => setShareMsg(""), 2500); }
    catch { setShareMsg(url); }
  }

  return (
    <div className={view === "faves" ? "has-filterbar" : ""} style={{ background: P.plaster, color: P.ink, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", transition: "background .2s ease, color .2s ease" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .disp { font-family: 'Bricolage Grotesque', 'Inter', sans-serif; }
        .card { transition: transform .16s ease, box-shadow .16s ease; box-shadow: 0 1px 2px rgba(13,20,40,.05), 0 6px 18px rgba(13,20,40,.05); }
        .card:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(13,20,40,.10), 0 22px 44px rgba(13,20,40,.14); }
        .chip { transition: background .14s ease, color .14s ease, border-color .14s ease; }
        .catrow { display: flex; flex-wrap: wrap; gap: 7px; padding-bottom: 4px; }
        .brandlogo { height: 58px; width: auto; max-width: 66vw; display: block; }
        @media (min-width: 680px) { .brandlogo { height: 92px; max-width: 440px; } }
        /* Stopgap: clip the baked-in tagline band off the bottom of the logo image.
           Tune --logo-crop (0 = none) if the wordmark or tagline shows through. */
        .brandlogo-crop { --logo-crop: 0.28; display: block; overflow: hidden; height: calc(58px * (1 - var(--logo-crop))); line-height: 0; }
        @media (min-width: 680px) { .brandlogo-crop { height: calc(92px * (1 - var(--logo-crop))); } }
        .hero-split { display: grid; grid-template-columns: 1fr; }
        @media (min-width: 600px) { .hero-split { grid-template-columns: 1.25fr 1fr; } }
        .wrap720 { max-width: 720px; margin: 0 auto; }
        @media (min-width: 760px) { .wrap720 { max-width: 1060px; } }
        .evgrid { display: grid; gap: 12px; }
        @media (min-width: 760px) { .evgrid { grid-template-columns: 1fr 1fr; gap: 16px; } }
        .viewnav-top { display: none; }
        @media (min-width: 680px) { .viewnav-top { display: flex; } }
        .viewnav-bottom { display: none; }
        .filterbar { display: none; }
        @media (max-width: 679px) {
          .viewnav-bottom { display: flex; }
          main { padding-bottom: 82px !important; }
          .filters-inline { display: none; }
          .filterbar { display: flex; position: fixed; left: 0; right: 0; bottom: calc(64px + env(safe-area-inset-bottom)); justify-content: center; z-index: 901; padding: 0 16px; pointer-events: none; }
          .filterbar > button { pointer-events: auto; }
          .has-filterbar main { padding-bottom: 128px !important; }
        }
        .picks-layout { display: block; }
        .filter-rail { margin-bottom: 20px; }
        @media (min-width: 680px) {
          .picks-layout { display: grid; grid-template-columns: 216px 1fr; gap: 26px; align-items: start; }
          .filter-rail { margin-bottom: 0; position: sticky; top: 92px; max-height: calc(100vh - 108px); overflow-y: auto; padding-right: 4px; }
        }
        button:focus-visible, [tabindex]:focus-visible { outline: 3px solid ${P.marigold}; outline-offset: 2px; border-radius: 10px; }
        .leaflet-container { font-family: inherit; border-radius: 16px; }
        @keyframes qpUp { from { transform: translateY(14px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .sheet { animation: qpUp .18s ease; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
      `}</style>

      {/* Header */}
      <header style={{ background: P.card, color: P.ink, borderBottom: `1px solid ${P.line}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ height: 8, background: `repeating-linear-gradient(135deg, ${P.cobalt} 0 8px, transparent 8px 16px), repeating-linear-gradient(45deg, ${P.rosa} 0 8px, ${P.marigold} 8px 16px)`, backgroundBlendMode: "multiply" }} />
        <div className="wrap720" style={{ padding: "9px 18px", display: "flex", alignItems: "center", gap: 22 }}>
          <button type="button" aria-label={lang === "es" ? "Inicio" : "Home"}
            onClick={() => { setView("faves"); setFavType(""); setFavCuisine(new Set()); setFavDiet(new Set()); setPicksLayout("list"); setQuery(""); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); }}
            style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "block" }}>
            <span className="brandlogo-crop">
              <img
                src={`/logo-${theme === "dark" ? "dark" : "light"}${lang === "es" ? "-es" : ""}.svg`}
                onError={(e) => { const en = `/logo-${theme === "dark" ? "dark" : "light"}.svg`; if (!e.currentTarget.src.endsWith(en)) e.currentTarget.src = en; }}
                alt={lang === "es" ? "Vamos San Miguel — Eventos · Recomendaciones · Guía local" : "Vamos San Miguel — Events · Local Picks · Insider Guide"}
                className="brandlogo" />
            </span>
          </button>
          <nav className="viewnav-top" style={{ flex: 1, justifyContent: "center", gap: 34, alignItems: "center" }}>
            {[["faves", t.faves], ["events", t.events], ["guides", "Guides"], ["saved", t.savedTab], ["planner", lang === "es" ? "Armar viaje" : "Plan Trip"]].map(([k, label]) => {
              const tabStyle = { border: "none", cursor: "pointer", background: "transparent", fontSize: 16.5, fontWeight: 700, padding: "6px 2px", whiteSpace: "nowrap", letterSpacing: ".01em",
                color: view === k ? P.coral : P.ink, borderBottom: view === k ? `3px solid ${P.coral}` : "3px solid transparent",
                display: "flex", alignItems: "center", gap: 6, textDecoration: "none" };
              if (k === "guides") return <GuidesDropdown key={k} lang={lang} P={P} tabStyle={tabStyle} />;
              if (k === "planner") return (
                <button key={k} onClick={() => setShowPlanner(true)}
                  style={{ border: "none", cursor: "pointer", background: P.coral, color: "#fff", fontSize: 15, fontWeight: 800, padding: "8px 16px", borderRadius: 999, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                  ✨ {label}
                </button>
              );
              if (k === "plan") return <a key={k} href="/plan" style={{ ...tabStyle, color: P.ink }}>{label}</a>;
              if (k === "move") return <a key={k} href="/move" style={{ ...tabStyle, color: P.ink }}>{label}</a>;
              return (
                <button key={k} onClick={() => setView(k)} style={tabStyle}>
                  {label}
                  {k === "saved" && (saved.size + savedPlaces.size) > 0 &&
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: P.coral, borderRadius: 999, padding: "1px 7px" }}>{saved.size + savedPlaces.size}</span>}
                </button>
              );
            })}
          </nav>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <div role="group" aria-label="Language" style={{ display: "flex", border: `1px solid ${P.line}`, borderRadius: 999, padding: 3 }}>
              {["en", "es"].map((l) => (
                <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                  style={{ border: "none", cursor: "pointer", padding: "5px 11px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                    background: lang === l ? P.cobalt : "transparent", color: lang === l ? "#fff" : P.inkSoft }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={() => setTheme((v) => (v === "dark" ? "light" : "dark"))}
              aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
              style={{ border: `1px solid ${P.line}`, cursor: "pointer", width: 36, height: 36, borderRadius: 10,
                display: "grid", placeItems: "center", background: "transparent", color: P.inkSoft }}>
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </header>

      <main className="wrap720" style={{ padding: "16px 18px 60px" }}>
        {/* A friend shared their trip — items were imported and marked "Shared" below */}
        {sharedNotice && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
            background: "#EEF3FB", border: `1px solid ${P.cobalt}`, borderRadius: 14, padding: "12px 16px", margin: "0 0 16px" }}>
            <span style={{ fontSize: 14, color: P.ink, fontWeight: 600 }}>
              {lang === "es"
                ? `🎁 Un amigo te compartió su viaje: ${sharedNotice.p} lugares · ${sharedNotice.e} eventos. Los agregamos a tus Guardados (marcados como “Compartido”).`
                : `🎁 A friend shared their trip: ${sharedNotice.p} places · ${sharedNotice.e} events. We added them to your Saved (marked “Shared”).`}
            </span>
            <button onClick={() => setSharedNotice(null)} style={{ border: `1px solid ${P.line}`, background: "transparent", color: P.inkSoft, cursor: "pointer", fontWeight: 600, fontSize: 13.5, padding: "8px 13px", borderRadius: 10 }}>
              {lang === "es" ? "Entendido" : "Got it"}
            </button>
          </div>
        )}
        {/* view tabs live in the header (desktop) and a bottom bar (mobile) */}

        {view === "events" ? (
          <>
            {/* Today highlight */}
            {todayCount > 0 && (
              <button onClick={() => { setDateF("today"); setEventLayout("list"); }}
                style={{ width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 12,
                  border: `1px solid ${P.line}`, borderRadius: 14, padding: "11px 14px",
                  background: `linear-gradient(90deg, ${P.rosa}14, ${P.marigold}10)`,
                  display: "flex", alignItems: "center", gap: 11 }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, background: P.rosa, color: "#fff",
                  display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <span className="disp" style={{ fontSize: 18, fontWeight: 800 }}>{todayCount}</span>
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="disp" style={{ display: "block", fontSize: 15, fontWeight: 700, color: P.ink }}>
                    {todayCount} {t.todayHero}
                  </span>
                  <span style={{ fontSize: 12.5, color: P.inkSoft }}>
                    · {weekendCount} {t.weekendHero}
                  </span>
                </span>
                <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: P.rosa, flexShrink: 0 }}>
                  {t.seeToday} →
                </span>
              </button>
            )}

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 10 }}>
              <Search size={17} color={P.inkSoft} style={{ position: "absolute", left: 13, top: 13 }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search}
                style={{ width: "100%", padding: "11px 12px 11px 38px", borderRadius: 12, border: `1px solid ${P.line}`,
                  background: P.card, fontSize: 15, color: P.ink, outline: "none", fontFamily: "inherit" }} />
              {query && <button onClick={() => setQuery("")} aria-label="clear"
                style={{ position: "absolute", right: 10, top: 9, border: "none", background: "transparent", cursor: "pointer" }}>
                <X size={17} color={P.inkSoft} /></button>}
            </div>

            {/* Row: date filters + view toggle */}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginBottom: 9 }}>
              {[["all", t.all], ["today", t.today], ["weekend", t.weekend], ["week", t.week]].map(([k, label]) => (
                <button key={k} onClick={() => setDateF(k)} className="chip"
                  style={{ cursor: "pointer", padding: "6px 13px", borderRadius: 999, fontSize: 13.5, fontWeight: 600,
                    border: `1px solid ${dateF === k ? P.cobalt : P.line}`,
                    background: dateF === k ? P.cobalt : P.chipBg, color: dateF === k ? "#fff" : P.inkSoft }}>
                  {label}
                </button>
              ))}

              {/* List / Map segmented toggle */}
              <div style={{ marginLeft: "auto", display: "flex", background: P.chipBg, border: `1px solid ${P.line}`, borderRadius: 999, padding: 3 }}>
                {[["list", ListIcon, t.listView], ["map", MapIcon, t.mapView]].map(([k, Ic, label]) => (
                  <button key={k} onClick={() => setEventLayout(k)} aria-pressed={eventLayout === k}
                    style={{ border: "none", cursor: "pointer", padding: "5px 11px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 5,
                      background: eventLayout === k ? P.cobalt : "transparent", color: eventLayout === k ? "#fff" : P.inkSoft }}>
                    <Ic size={14} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audience + category chips — single scrollable row */}
            <div className="catrow" style={{ marginBottom: 14 }}>
              {Object.entries(AUDIENCES).map(([k, a]) => {
                const on = aud.has(k);
                const Ic = a.Icon;
                return (
                  <button key={k} onClick={() => toggle(setAud, aud, k)} className="chip"
                    style={{ cursor: "pointer", padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                      display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                      border: `1px solid ${on ? P.cobalt : P.line}`, background: on ? P.cobalt : P.chipBg, color: on ? "#fff" : P.inkSoft }}>
                    <Ic size={13} /> {a[lang]}
                  </button>
                );
              })}
              <span style={{ width: 1, alignSelf: "stretch", background: P.line, margin: "3px 4px", flexShrink: 0 }} />
              {Object.entries(CATS).map(([k, c]) => {
                const on = cats.has(k);
                const Ic = c.Icon;
                return (
                  <button key={k} onClick={() => toggle(setCats, cats, k)} className="chip"
                    style={{ cursor: "pointer", padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                      display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                      border: `1px solid ${on ? c.c : P.line}`, background: on ? c.c : P.chipBg, color: on ? "#fff" : P.inkSoft }}>
                    <Ic size={13} /> {c[lang]}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: P.inkSoft, fontWeight: 500 }}>{filtered.length} {t.results}</span>
              {anyFilter && <button onClick={() => { setCats(new Set()); setAud(new Set()); setDateF("all"); setQuery(""); }}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: P.cobalt, fontWeight: 600 }}>
                {t.clear}</button>}
            </div>

            {/* Body: list or map */}
            {eventLayout === "map" ? (
              <MapView events={filtered} lang={lang} P={P} onOpen={setDetail} />
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: P.inkSoft }}>
                <p className="disp" style={{ fontSize: 17, fontWeight: 700, color: P.ink, margin: "0 0 6px" }}>{t.none}</p>
                <p style={{ margin: 0, fontSize: 14 }}>{t.noneHint}</p>
              </div>
            ) : (
              <div className="evgrid">
                {filtered.map((e) => (
                  <EventCard key={e.id} e={e} lang={lang} t={t} P={P} saved={saved.has(e.id)}
                    onSave={() => toggle(setSaved, saved, e.id)} onOpen={() => setDetail(e)} />
                ))}
              </div>
            )}
          </>
        ) : view === "faves" ? (
          <>
            {favActive ? (
              /* Results header — shown once any filter is active (replaces the hero + intro). */
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: P.marigold, margin: "0 0 7px" }}>
                  San Miguel de Allende <span style={{ color: P.inkSoft }}>· {lang === "es" ? "Recomendaciones locales" : "Local Picks"}</span>
                </p>
                <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(24px, 4vw, 34px)", margin: "0 0 8px", letterSpacing: "-.01em", lineHeight: 1.08 }}>
                  {lang === "es"
                    ? `Nuestros ${TYPE_LABEL_PLURAL[favType][lang].toLowerCase()} favoritos`
                    : `Our favorite ${TYPE_LABEL_PLURAL[favType][lang].toLowerCase()}`}
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "0 0 12px" }}>
                  <p style={{ color: P.inkSoft, margin: 0, fontSize: 14.5, lineHeight: 1.5 }}>
                    {lang === "es"
                      ? `${shownCount} ${shownCount === 1 ? "lugar" : "lugares"} · Elegidos a mano, nunca pagados.`
                      : `${shownCount} ${shownCount === 1 ? "place" : "places"} · Hand-picked, never paid for.`}
                  </p>
                  <button onClick={() => setFilterSheet(true)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${P.cobalt}`, background: P.chipBg, cursor: "pointer", color: P.cobalt, fontWeight: 700, fontSize: 13, padding: "5px 13px", borderRadius: 999 }}>
                    <SlidersHorizontal size={14} /> {lang === "es" ? "Cambiar" : "Change"}
                  </button>
                  <button onClick={() => { setFavType(""); setFavCuisine(new Set()); setFavDiet(new Set()); }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${P.line}`, background: P.chipBg, cursor: "pointer", color: P.inkSoft, fontWeight: 600, fontSize: 13, padding: "5px 13px", borderRadius: 999 }}>
                    <X size={14} /> {lang === "es" ? "Limpiar" : "Clear"}
                  </button>
                </div>
                {(() => {
                  const cats = [
                    ...[...favCuisine].map((k) => CUISINES[k] && { label: CUISINES[k][lang], Icon: CUISINES[k].Icon, good: GOODFOR.includes(k) }),
                    ...[...favDiet].map((k) => DIET[k] && { label: DIET[k][lang], Icon: DIET[k].Icon, good: true }),
                  ].filter(Boolean);
                  if (!cats.length) return null;
                  return (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {cats.map((c, i) => { const Ic = c.Icon; return (
                        <button key={i} onClick={() => setFilterSheet(true)} title={lang === "es" ? "Cambiar filtros" : "Change filters"}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, padding: "4px 11px", borderRadius: 999, cursor: "pointer",
                            border: `1px solid ${c.good ? "#CFE3D6" : P.line}`, background: c.good ? "#EEF5F0" : P.chipBg, color: c.good ? GREEN : P.coral }}>
                          <Ic size={12} /> {c.label}
                        </button>
                      ); })}
                    </div>
                  );
                })()}
              </div>
            ) : (
            <>
            {/* Editorial page header */}
            <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: P.marigold, margin: "0 0 7px" }}>
              San Miguel de Allende <span style={{ color: P.inkSoft }}>· {lang === "es" ? "Recomendaciones locales" : "Local Picks"}</span>
            </p>
            <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(26px, 4.2vw, 38px)", margin: "0 0 8px", letterSpacing: "-.01em", lineHeight: 1.06 }}>
              {lang === "es" ? "Los lugares a los que mandamos a nuestros amigos." : "The places we send our friends to."}
            </h1>
            <p style={{ color: P.inkSoft, margin: "0 0 22px", fontSize: 15.5, lineHeight: 1.5, maxWidth: "58ch" }}>
              {lang === "es"
                ? "Elegidos a mano, nunca pagados. Cada lugar aquí es uno al que te llevaríamos nosotros mismos, en el Centro y los alrededores."
                : "Hand-picked, never paid for. Every spot here is one we'd walk you to ourselves, in Centro and the surrounding countryside."}
            </p>

            {/* Featured pick of the week — rotates weekly among curated (featured) picks. */}
            {(() => {
              const all = favLists.flatMap((l) => l.items || []);
              const curated = all.filter((x) => x.featured && x.img).sort((a, b) => (a.featured_rank ?? 9999) - (b.featured_rank ?? 9999));
              const pool = curated.length ? curated : all.filter((x) => x.img);
              const week = Math.floor(Date.now() / 6.048e8); // 7 days in ms
              const f = pool.length ? pool[week % pool.length] : all[0];
              if (!f) return null;
              const fc = CATS[f.cat] || { c: P.coral, es: "", en: "" };
              const fType = PLACE_TYPE[f.list_key] || PLACE_TYPE.rest;
              const fCui = f.list_key === "rest" ? (f.cuisine || []) : [];
              const fPrimary = fCui.find((c) => !GOODFOR.includes(c) && CUISINES[c]);
              const fGood = fCui.filter((c) => GOODFOR.includes(c));
              const fDietKey = (f.diet || []).includes("vegan") ? "vegan" : (f.diet || []).includes("vegetarian") ? "vegetarian" : null;
              const fty = fPrimary === "cafe" ? "Café" : fType[lang];
              const fIcons = [fType.Icon, fPrimary && CUISINES[fPrimary].Icon, ...fGood.map((k) => CUISINES[k].Icon), fDietKey && DIET[fDietKey].Icon].filter(Boolean);
              const isSaved = savedPlaces.has(f.name);
              return (
                <div className="card hero-split" style={{ borderRadius: 20, overflow: "hidden", border: `1px solid ${P.line}`, marginBottom: 26 }}>
                  <div style={{ position: "relative", minHeight: 230 }}>
                    <Media img={f.img} cat={f.cat} iconSize={44} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,20,40,.74), transparent 55%)" }} />
                    <div style={{ position: "absolute", left: 18, right: 18, bottom: 16, color: "#fff" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ background: "rgba(255,255,255,.94)", color: P.cobalt, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", padding: "4px 11px", borderRadius: 999 }}>{fty}</span>
                        {fIcons.length > 1 && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.94)", padding: "4px 10px", borderRadius: 999 }}>
                            {fIcons.map((Ic, i) => <Ic key={i} size={14} color={P.coral} />)}
                          </span>
                        )}
                      </span>
                      <h3 style={{ fontFamily: "Georgia, serif", fontSize: 25, margin: "10px 0 3px", textShadow: "0 2px 16px rgba(0,0,0,.45)" }}>{f.name}</h3>
                      <p style={{ margin: 0, fontSize: 13.5, opacity: .9 }}>{areaLabel(f, lang)}</p>
                    </div>
                  </div>
                  <div style={{ padding: "22px", display: "flex", flexDirection: "column", justifyContent: "center", background: P.card }}>
                    <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: P.coral, fontWeight: 700 }}>
                      {lang === "es" ? "Recomendación de la semana" : "This week's featured pick"}
                    </span>
                    {f[lang] && <p style={{ margin: "10px 0 16px", color: P.inkSoft, fontSize: 14.5, lineHeight: 1.5 }}>{f[lang]}</p>}
                    <button onClick={() => toggleSavePlace(f.name)}
                      style={{ alignSelf: "flex-start", border: "none", cursor: "pointer", background: P.cobalt, color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 18px", borderRadius: 11, display: "flex", alignItems: "center", gap: 7 }}>
                      <Heart size={16} fill={isSaved ? "#fff" : "none"} /> {isSaved ? (lang === "es" ? "Guardado" : "Saved") : (lang === "es" ? "Guardar" : "Save")}
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 15, fontSize: 12.5, color: "#2F7A63", fontWeight: 700 }}>
                      <Check size={15} /> {lang === "es" ? "Nunca cobramos por una recomendación" : "We never take money for a pick"}
                    </div>
                  </div>
                </div>
              );
            })()}
            </>
            )}

            {/* Desktop: sticky filter rail beside the grid. Mobile: filters live in the bottom sheet. */}
            <div className="picks-layout">
              <div className="filters-inline filter-rail">
                <FilterGroups favType={favType} setFavType={setFavType} favCuisine={favCuisine}
                  setFavCuisine={setFavCuisine} favDiet={favDiet} setFavDiet={setFavDiet} lang={lang} t={t} P={P} />
              </div>
              <div className="picks-main">
            {/* Toolbar: count on the left, List/Map toggle on the right */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
              <span style={{ fontSize: 13, color: P.inkSoft, fontWeight: 600 }}>
                {favFiltered.reduce((n, l) => n + (l.items ? l.items.length : 0), 0)} {lang === "es" ? "lugares" : "places"}
              </span>
              <div style={{ display: "flex", background: P.chipBg, border: `1px solid ${P.line}`, borderRadius: 999, padding: 3, flexShrink: 0 }}>
                {[["list", ListIcon, t.listView], ["map", MapIcon, t.mapView]].map(([k, Ic, label]) => (
                  <button key={k} onClick={() => setPicksLayout(k)} aria-pressed={picksLayout === k}
                    style={{ border: "none", cursor: "pointer", padding: "5px 11px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 5,
                      background: picksLayout === k ? P.cobalt : "transparent", color: picksLayout === k ? "#fff" : P.inkSoft }}>
                    <Ic size={14} /> {label}
                  </button>
                ))}
              </div>
            </div>
            {picksLayout === "map" ? (
              <PicksMap lists={favFiltered} lang={lang} t={t} P={P} onOpen={setPlaceDetail} />
            ) : favFiltered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: P.inkSoft }}>
                <p className="disp" style={{ fontSize: 16, fontWeight: 700, color: P.ink, margin: "0 0 6px" }}>{t.none}</p>
                <p style={{ margin: 0, fontSize: 14 }}>{t.noneHint}</p>
              </div>
            ) : favFiltered.map((list) => {
              // Favorites first (featured, by rank), then the rest. Show a curated top 10
              // per section by default so the home doesn't dump 80+ cards at once.
              const sorted = [...list.items].sort((a, b) =>
                (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.featured_rank ?? 9999) - (b.featured_rank ?? 9999));
              const TOP = 10;
              const expanded = expandedLists.has(list.key);
              const shown = expanded ? sorted : sorted.slice(0, TOP);
              return (
              <section key={list.key} style={{ marginBottom: 22 }}>
                <h2 className="disp" style={{ fontSize: 17, fontWeight: 700, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: CATS[list.cat].c }} />
                  {list[lang]}
                  {sorted.length > TOP && <span style={{ fontSize: 13, fontWeight: 600, color: P.inkSoft }}>· {lang === "es" ? `Top ${TOP} de ${sorted.length}` : `Top ${TOP} of ${sorted.length}`}</span>}
                </h2>
                <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                  {shown.map((it) => (
                    <PlaceCard key={it.name} it={it} lang={lang} t={t} P={P}
                      saved={savedPlaces.has(it.name)} onSave={() => toggleSavePlace(it.name)}
                      onOpen={() => setPlaceDetail(it)} />
                  ))}
                </div>
                {sorted.length > TOP && (
                  <button onClick={() => setExpandedLists((s) => { const n = new Set(s); n.has(list.key) ? n.delete(list.key) : n.add(list.key); return n; })}
                    style={{ marginTop: 12, border: `1px solid ${P.line}`, background: P.chipBg, cursor: "pointer", color: P.cobalt, fontWeight: 700, fontSize: 13.5, padding: "9px 18px", borderRadius: 999 }}>
                    {expanded ? (lang === "es" ? "Mostrar menos" : "Show less") : (lang === "es" ? `Ver los ${sorted.length}` : `Show all ${sorted.length}`)}
                  </button>
                )}
              </section>
              );
            })}
              </div>
            </div>
          </>
        ) : view === "move" ? (
          <div>
            <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: P.marigold, margin: "0 0 7px" }}>
              {lang === "es" ? "Mudarse a San Miguel" : "Move to San Miguel"}
            </p>
            <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(26px, 4.2vw, 38px)", margin: "0 0 8px", letterSpacing: "-.01em", lineHeight: 1.06 }}>
              {lang === "es" ? "¿Pensando en mudarte aquí?" : "Thinking about making the move?"}
            </h1>
            <p style={{ color: P.inkSoft, margin: "0 0 24px", fontSize: 15.5, lineHeight: 1.55, maxWidth: "62ch" }}>
              {lang === "es"
                ? "Estamos preparando la guía completa para mudarse a San Miguel: visas y residencia, costo de vida, salud, escuelas, y el caso financiero de vivir en México. Muy pronto."
                : "We're building the complete guide to moving to San Miguel: visas and residency, cost of living, healthcare, schools, and the financial case for living in Mexico. Coming soon."}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
              {[
                lang === "es" ? ["El caso financiero", "FEIE, impuestos estatales y la aritmética del arbitraje geográfico"] : ["The money case", "FEIE, state taxes, and the geographic-arbitrage math"],
                lang === "es" ? ["Visas y residencia", "Residencia temporal y permanente: umbrales y plazos"] : ["Visas & residency", "Temporary and permanent residency, thresholds, timelines"],
                lang === "es" ? ["Costo de vida", "Vivienda, salud, dinero y la vida diaria"] : ["Cost of living", "Housing, healthcare, money, and daily life"],
                lang === "es" ? ["La vida en San Miguel", "Seguridad, idioma, criar hijos y escuelas"] : ["Life in San Miguel", "Safety, language, raising kids, and schools"],
              ].map(([h, dsc], i) => (
                <div key={i} className="card" style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 14, padding: "16px 17px" }}>
                  <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, margin: "0 0 5px" }}>{h}</h3>
                  <p style={{ margin: 0, fontSize: 13.5, color: P.inkSoft, lineHeight: 1.45 }}>{dsc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ---- Saved (device-based personal collection) ---- */
          <>
          {savedItinerary && (
            <SavedItinerary itin={savedItinerary} setItin={setSavedItinerary} lang={lang} t={t} P={P}
              onOpenPick={(name) => { const it = favLists.flatMap((l) => l.items || []).find((x) => x.name === name); if (it) setPlaceDetail(it); }}
              onOpenEvent={(name) => { const e = events.find((x) => x.title?.en === name || x.title?.[lang] === name); if (e) setDetail(e); }} />
          )}
          {savedEvents.length === 0 && savedPlaceItems.length === 0 ? (savedItinerary ? null : (
            <div style={{ textAlign: "center", padding: "48px 24px", color: P.inkSoft }}>
              <Heart size={30} color={P.rosa} style={{ opacity: .6 }} />
              <p className="disp" style={{ fontSize: 17, fontWeight: 700, color: P.ink, margin: "12px 0 6px" }}>{t.savedEmpty}</p>
              <p style={{ margin: "0 0 18px", fontSize: 14, maxWidth: 320, marginInline: "auto", lineHeight: 1.5 }}>{t.savedHint}</p>
              <button onClick={() => setShowPlanner(true)}
                style={{ border: "none", background: P.coral, color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 15, padding: "12px 22px", borderRadius: 12, boxShadow: "0 4px 14px rgba(224,106,99,.28)" }}>
                ✨ {lang === "es" ? "Deja que la IA arme tu viaje" : "Let AI plan your trip"}
              </button>
            </div>
          )) : (
            <>
              {/* Toolbar: title + Share + List/Map toggle (map = "My Trip" planner) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
                <h2 className="disp" style={{ fontSize: 15, fontWeight: 800, margin: 0, color: P.ink }}>
                  {lang === "es" ? "Mi viaje" : "My Trip"}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => setShowPlanner(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: P.coral, cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 13, padding: "7px 14px", borderRadius: 999 }}>
                  ✨ {lang === "es" ? "Armar viaje" : "Plan with AI"}
                </button>
                <button onClick={shareTrip}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${P.cobalt}`, background: P.chipBg, cursor: "pointer", color: P.cobalt, fontWeight: 700, fontSize: 13, padding: "6px 13px", borderRadius: 999 }}>
                  <Share2 size={14} /> {shareMsg || (lang === "es" ? "Compartir viaje" : "Share trip")}
                </button>
                <div style={{ display: "flex", background: P.chipBg, border: `1px solid ${P.line}`, borderRadius: 999, padding: 3, flexShrink: 0 }}>
                  {[["list", ListIcon, t.listView], ["map", MapIcon, t.mapView]].map(([k, Ic, label]) => (
                    <button key={k} onClick={() => setSavedLayout(k)} aria-pressed={savedLayout === k}
                      style={{ border: "none", cursor: "pointer", padding: "5px 11px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                        display: "flex", alignItems: "center", gap: 5,
                        background: savedLayout === k ? P.cobalt : "transparent", color: savedLayout === k ? "#fff" : P.inkSoft }}>
                      <Ic size={14} /> {label}
                    </button>
                  ))}
                </div>
                </div>
              </div>

              {savedLayout === "map" ? (
                <TripMap places={savedPlaceItems} events={savedEvents} stay={stay} setStay={setStay}
                  lang={lang} t={t} P={P} onOpenPlace={setPlaceDetail} onOpenEvent={setDetail} />
              ) : (
              <>
              {savedEvents.length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <h2 className="disp" style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px", color: P.inkSoft, textTransform: "uppercase", letterSpacing: ".04em" }}>{t.savedEvents}</h2>
                  <div style={{ display: "grid", gap: 12 }}>
                    {savedEvents.map((e) => (
                      <div key={e.id} style={{ position: "relative" }}>
                        {sharedEventIds.has(e.id) && <SharedBadge lang={lang} P={P} />}
                        <EventCard e={e} lang={lang} t={t} P={P} saved={saved.has(e.id)}
                          onSave={() => toggle(setSaved, saved, e.id)} onOpen={() => setDetail(e)} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {savedPlaceItems.length > 0 && (
                <section style={{ marginBottom: 8 }}>
                  <h2 className="disp" style={{ fontWeight: 700, margin: "0 0 10px", color: P.inkSoft, textTransform: "uppercase", letterSpacing: ".04em", fontSize: 13 }}>{t.savedPlaces}</h2>
                  <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                    {savedPlaceItems.map((it) => (
                      <div key={it.name} style={{ position: "relative" }}>
                        {sharedNames.has(it.name) && <SharedBadge lang={lang} P={P} />}
                        <PlaceCard it={it} lang={lang} t={t} P={P}
                          saved={savedPlaces.has(it.name)} onSave={() => toggleSavePlace(it.name)}
                          onOpen={() => setPlaceDetail(it)} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {/* Encourage building the trip out */}
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button onClick={() => setView("faves")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "none", background: P.coral, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14.5, padding: "12px 22px", borderRadius: 12, boxShadow: "0 4px 14px rgba(224,106,99,.28)" }}>
                  <Search size={17} /> {lang === "es" ? "Agregar más de Recomendaciones locales" : "Add more from Local Picks"}
                </button>
              </div>
              </>
              )}
            </>
          )}
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 12, color: P.inkSoft, marginTop: 34, lineHeight: 1.6 }}>{t.footer}</p>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="viewnav-bottom" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 900,
        background: P.card, borderTop: `1px solid ${P.line}`, boxShadow: "0 -2px 14px rgba(13,20,40,.09)",
        justifyContent: "space-around", padding: "8px 0 calc(8px + env(safe-area-inset-bottom))" }}>
        {[["faves", t.faves, MapPin], ["events", t.events, Clock], ["planner", lang === "es" ? "Viaje" : "Plan Trip", Sparkles], ["plan", lang === "es" ? "Planea" : "Plan", MapIcon], ["move", lang === "es" ? "Mudarse" : "Move Here", Home], ["saved", t.savedTab, Heart]].map(([k, label, Ic]) => {
          const tabStyle = { border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: view === k ? P.coral : P.inkSoft, fontSize: 10, fontWeight: 700, position: "relative", minWidth: 46, textDecoration: "none" };
          if (k === "planner") return (
            <button key={k} onClick={() => setShowPlanner(true)} style={{ ...tabStyle, color: P.coral }}>
              <Ic size={21} /> {label}
            </button>
          );
          if (k === "plan" || k === "move") return (
            <a key={k} href={k === "plan" ? "/plan" : "/move"} style={{ ...tabStyle, color: P.inkSoft }}>
              <Ic size={21} /> {label}
            </a>
          );
          return (
            <button key={k} onClick={() => setView(k)} aria-pressed={view === k} style={tabStyle}>
              <Ic size={21} fill={k === "saved" && view === k ? P.coral : "none"} />
              {label}
              {k === "saved" && (saved.size + savedPlaces.size) > 0 &&
                <span style={{ position: "absolute", top: -3, right: 14, fontSize: 10, fontWeight: 700, color: "#fff", background: P.coral, borderRadius: 999, padding: "0 5px" }}>{saved.size + savedPlaces.size}</span>}
            </button>
          );
        })}
      </nav>

      {/* Mobile: floating Filters pill (Local Picks only) */}
      {view === "faves" && (
        <div className="filterbar">
          <button onClick={() => setFilterSheet(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 9, border: "none", cursor: "pointer",
              background: P.cobalt, color: "#fff", fontWeight: 700, fontSize: 14.5, padding: "12px 20px", borderRadius: 999, boxShadow: "0 6px 20px rgba(13,20,40,.30)" }}>
            <SlidersHorizontal size={17} />
            {favType ? TYPE_LABEL_PLURAL[favType][lang] : (lang === "es" ? "Filtrar lugares" : "Filter places")}
            {(favCuisine.size + favDiet.size) > 0 && (
              <span style={{ background: P.coral, color: "#fff", fontSize: 12, fontWeight: 800, minWidth: 20, height: 20, borderRadius: 999, display: "grid", placeItems: "center", padding: "0 6px" }}>{favCuisine.size + favDiet.size}</span>
            )}
          </button>
        </div>
      )}

      {filterSheet && (
        <div onClick={() => setFilterSheet(false)} role="dialog" aria-modal="true" aria-label={lang === "es" ? "Filtros" : "Filters"}
          style={{ position: "fixed", inset: 0, background: P.scrim, display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}
            style={{ background: P.sheet, color: P.ink, width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto", borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,.28)" }}>
            <div style={{ position: "sticky", top: 0, background: P.sheet, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px", borderBottom: `1px solid ${P.line}` }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, margin: 0 }}>{lang === "es" ? "Filtros" : "Filters"}</h2>
              <button onClick={() => setFilterSheet(false)} aria-label={t.back} style={{ border: "none", background: "transparent", cursor: "pointer", color: P.inkSoft, display: "grid", placeItems: "center" }}><X size={22} /></button>
            </div>
            <div style={{ padding: "16px 18px 12px" }}>
              <FilterGroups favType={favType} setFavType={setFavType} favCuisine={favCuisine}
                setFavCuisine={setFavCuisine} favDiet={favDiet} setFavDiet={setFavDiet} lang={lang} t={t} P={P} />
            </div>
            <div style={{ position: "sticky", bottom: 0, background: P.sheet, display: "flex", gap: 10, padding: "12px 18px calc(14px + env(safe-area-inset-bottom))", borderTop: `1px solid ${P.line}` }}>
              <button onClick={() => { setFavType(""); setFavCuisine(new Set()); setFavDiet(new Set()); }}
                style={{ flexShrink: 0, border: `1px solid ${P.line}`, background: P.chipBg, color: P.ink, cursor: "pointer", fontWeight: 700, fontSize: 14, padding: "12px 16px", borderRadius: 12 }}>{lang === "es" ? "Limpiar" : "Clear"}</button>
              <button onClick={() => setFilterSheet(false)}
                style={{ flex: 1, border: "none", background: P.cobalt, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 15, padding: "12px 16px", borderRadius: 12 }}>
                {lang === "es" ? `Ver ${shownCount} lugares` : `Show ${shownCount} places`}
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <EventDetail e={detail} lang={lang} t={t} P={P} saved={saved.has(detail.id)}
          onSave={() => toggle(setSaved, saved, detail.id)} onClose={() => setDetail(null)} />
      )}

      {placeDetail && (
        <PlaceDetail it={placeDetail} lang={lang} t={t} P={P} saved={savedPlaces.has(placeDetail.name)}
          onSave={() => toggleSavePlace(placeDetail.name)} onClose={() => setPlaceDetail(null)} />
      )}

      {showPlanner && (
        <TripPlanner
          onClose={() => setShowPlanner(false)}
          stay={stay} savedNames={[...savedPlaces]} lang={lang} t={t} P={P}
          onOpenPick={(name) => { const it = favLists.flatMap((l) => l.items || []).find((x) => x.name === name); if (it) setPlaceDetail(it); }}
          onOpenEvent={(name) => { const e = events.find((x) => (x.title?.en === name) || (x.title?.[lang] === name)); if (e) setDetail(e); }}
          onSaveAll={(res, ctx) => {
            const names = res.days.flatMap((d) => d.items.filter((i) => i.kind !== "event").map((i) => i.name));
            const ids = res.days.flatMap((d) => d.items.filter((i) => i.kind === "event")
              .map((i) => (events.find((x) => x.title?.en === i.name || x.title?.[lang] === i.name) || {}).id).filter(Boolean));
            if (names.length) setSavedPlaces((s) => new Set([...s, ...names]));
            if (ids.length) setSaved((s) => new Set([...s, ...ids]));
            setSavedItinerary({ ...res, _ctx: ctx || null }); // keep the schedule + inputs for chat tweaks
            setShowPlanner(false); setView("saved");
          }} />
      )}
    </div>
  );
}

/* ---- Map view ---------------------------------------------------- */
function FitBounds({ events }) {
  const map = useMap();
  useEffect(() => {
    if (!events.length) return;
    const pts = events.filter((e) => e.lat && e.lng).map((e) => [e.lat, e.lng]);
    if (pts.length === 1) map.setView(pts[0], 15);
    else if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
  }, [events, map]);
  return null;
}

function MapView({ events, lang, P, onOpen }) {
  const withCoords = events.filter((e) => e.lat && e.lng);
  return (
    <div style={{ border: `1px solid ${P.line}`, borderRadius: 16, overflow: "hidden", height: 460 }}>
      <MapContainer center={[20.9145, -100.7436]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds events={withCoords} />
        {withCoords.map((e) => (
          <Marker key={e.id} position={[e.lat, e.lng]} icon={catIcon(CATS[e.cat].c)}>
            <Popup>
              <strong style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{e.title[lang]}</strong>
              <br />
              <span style={{ color: "#6B5D4F" }}>{e.venue}</span>
              <br />
              <button onClick={() => onOpen(e)}
                style={{ marginTop: 6, border: "none", background: CATS[e.cat].c, color: "#fff", cursor: "pointer",
                  padding: "5px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
                {T[lang].details} →
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

/* ---- Local Picks map ---------------------------------------------- */
function FitBoundsPts({ pts }) {
  const map = useMap();
  useEffect(() => {
    if (!pts.length) return;
    if (pts.length === 1) map.setView(pts[0], 16);
    else map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
    // Refit only when the set of points meaningfully changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pts.length, pts[0]?.[0], pts[0]?.[1]]);
  return null;
}

function PicksMap({ lists, lang, t, P, onOpen }) {
  const [zoom, setZoom] = useState(15);
  const zoomedIn = zoom >= ICON_ZOOM;

  const items = [];
  lists.forEach((list) => (list.items || []).forEach((it) => { if (it.lat && it.lng) items.push(it); }));

  if (!items.length) {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px", color: P.inkSoft, border: `1px dashed ${P.line}`, borderRadius: 16 }}>
        <MapIcon size={26} style={{ opacity: .5 }} />
        <p className="disp" style={{ fontSize: 16, fontWeight: 700, color: P.ink, margin: "10px 0 4px" }}>
          {lang === "es" ? "Sin ubicaciones en el mapa todavía" : "No map locations yet"}
        </p>
        <p style={{ margin: 0, fontSize: 14 }}>
          {lang === "es" ? "Estos lugares aún no tienen coordenadas." : "These spots don't have coordinates yet."}
        </p>
      </div>
    );
  }

  const pts = items.map((it) => [it.lat, it.lng]);
  const regions = neighborhoodRegions();
  // Legend by cuisine/type (matches pin colors), most common first.
  const byKey = {};
  items.forEach((it) => { const e = pickLegendKey(it, lang); (byKey[e.key] ||= { ...e, n: 0 }).n++; });
  const legend = Object.values(byKey).sort((a, b) => b.n - a.n);

  return (
    <div>
      <div style={{ border: `1px solid ${P.line}`, borderRadius: 16, overflow: "hidden", height: "clamp(420px, 66vh, 620px)" }}>
        <MapContainer center={pts[0]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {/* Soft neighborhood regions with borders + hover labels */}
          {regions.map((r) => (
            <Polygon key={r.name} positions={r.latlngs}
              pathOptions={{ color: r.color, weight: 1.5, opacity: 0.7, fillColor: r.color, fillOpacity: 0.16 }}>
              <Tooltip sticky opacity={1}>{r.name}</Tooltip>
            </Polygon>
          ))}
          <FitBoundsPts pts={pts} />
          <ZoomWatch onZoom={setZoom} />
          {items.map((it, i) => (
            <Marker key={it.name + i} position={[it.lat, it.lng]} icon={placeMarkerIcon(it, zoomedIn)}>
              <Popup>
                <strong style={{ fontFamily: "Georgia, serif" }}>{it.name}</strong>
                <br /><span style={{ color: "#6B5D4F" }}>{areaLabel(it, lang)}</span>
                <br />
                <button onClick={() => onOpen(it)}
                  style={{ marginTop: 6, border: "none", background: pickColor(it), color: "#fff", cursor: "pointer",
                    padding: "5px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
                  {t.details} →
                </button>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {/* Cuisine legend + zoom hint */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 12px", marginTop: 10 }}>
        {legend.map((e) => (
          <span key={e.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: P.inkSoft, fontWeight: 600 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
            {e.label}
          </span>
        ))}
        {!zoomedIn && (
          <span style={{ fontSize: 12, color: "#B9AE9C", marginLeft: "auto" }}>
            {lang === "es" ? "Acerca para ver íconos de cocina" : "Zoom in for cuisine icons"}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---- Saved "My Trip" map ------------------------------------------ */
const stayIcon = () =>
  L.divIcon({
    className: "qp-stay",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);background:#0D1B36;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)">
      <span style="transform:rotate(45deg);color:#fff;font-size:14px;line-height:1">★</span></span>`,
    iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28],
  });

function ClickToSetStay({ onSet }) {
  useMapEvents({ click(e) { onSet([e.latlng.lat, e.latlng.lng]); } });
  return null;
}

function TripMap({ places, events, stay, setStay, lang, t, P, onOpenPlace, onOpenEvent }) {
  const placePins = places.filter((p) => p.lat && p.lng);
  const eventPins = events.filter((e) => e.lat && e.lng);
  // Fit to the saved items only (stable), so dropping the stay pin doesn't re-zoom.
  const fitPts = [...placePins.map((p) => [p.lat, p.lng]), ...eventPins.map((e) => [e.lat, e.lng])];
  const center = stay || fitPts[0] || [20.9145, -100.7436];
  // Rough walking time from the stay pin (~4.6 km/h on hilly cobblestones).
  const walkFromStay = (lat, lng) => stay ? Math.max(1, Math.round(kmBetween(stay[0], stay[1], lat, lng) * 13)) : null;
  const walkLabel = (lat, lng) => { const m = walkFromStay(lat, lng); return m == null ? null : (lang === "es" ? `~${m} min a pie` : `~${m} min walk`); };

  // Set the stay pin from a typed hotel/address or a pasted map link / "lat, lng".
  const [stayQuery, setStayQuery] = useState("");
  const [staySearching, setStaySearching] = useState(false);
  const [stayErr, setStayErr] = useState("");
  async function setStayFromText(raw) {
    const q = (raw || "").trim(); if (!q) return;
    setStayErr("");
    const m = q.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/) || q.match(/^(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/) || q.match(/[?&](?:q|query|ll)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
    if (m) { setStay([parseFloat(m[1]), parseFloat(m[2])]); setStayQuery(""); return; }
    setStaySearching(true);
    try {
      const r = await fetch(`/api/geocode-address?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (j.ok && j.lat && j.lng) { setStay([j.lat, j.lng]); setStayQuery(""); }
      else setStayErr(lang === "es" ? "No encontramos ese lugar. Intenta con la dirección." : "Couldn't find that. Try the full address.");
    } catch { setStayErr(lang === "es" ? "Error de búsqueda." : "Search error."); }
    setStaySearching(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={stayQuery}
            onChange={(e) => setStayQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setStayFromText(stayQuery); }}
            placeholder={lang === "es" ? "Hotel, dirección o enlace del mapa" : "Hotel name, address, or map link"}
            style={{ flex: 1, minWidth: 200, padding: "9px 12px", borderRadius: 10, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", background: P.card, color: P.ink }} />
          <button onClick={() => setStayFromText(stayQuery)} disabled={staySearching || !stayQuery.trim()}
            style={{ border: "none", background: staySearching || !stayQuery.trim() ? P.inkSoft : P.cobalt, color: "#fff", cursor: staySearching ? "default" : "pointer", fontWeight: 700, fontSize: 13.5, padding: "9px 16px", borderRadius: 10 }}>
            {staySearching ? (lang === "es" ? "Buscando…" : "Finding…") : (lang === "es" ? "Fijar alojamiento" : "Set stay")}
          </button>
          {stay && (
            <button onClick={() => { setStay(null); setStayErr(""); }}
              style={{ border: `1px solid ${P.line}`, background: P.chipBg, cursor: "pointer", color: P.inkSoft, fontWeight: 600, fontSize: 12.5, padding: "8px 12px", borderRadius: 10 }}>
              {lang === "es" ? "Quitar" : "Remove"}
            </button>
          )}
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: stayErr ? P.coral : P.inkSoft }}>
          {stayErr || (stay
            ? (lang === "es" ? "Alojamiento fijado. También puedes tocar el mapa para moverlo." : "Stay pinned. You can also tap the map to move it.")
            : (lang === "es" ? "O toca el mapa para marcar dónde te hospedas." : "Or tap the map to drop your stay pin."))}
        </p>
      </div>
      <div style={{ border: `1px solid ${P.line}`, borderRadius: 16, overflow: "hidden", height: "clamp(460px, 74vh, 700px)" }}>
        <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {fitPts.length > 0 && <FitBoundsPts pts={fitPts} />}
          <ClickToSetStay onSet={setStay} />

          {placePins.map((p, i) => (
            <Marker key={"p" + p.name + i} position={[p.lat, p.lng]} icon={catIcon(pickColor(p))}>
              <Popup>
                <strong style={{ fontFamily: "Georgia, serif" }}>{p.name}</strong>
                <br /><span style={{ color: "#6B5D4F" }}>{areaLabel(p, lang)}</span>
                {stay && <><br /><span style={{ color: "#2F7A63", fontWeight: 600 }}>{walkLabel(p.lat, p.lng)}</span></>}
                <br />
                <button onClick={() => onOpenPlace(p)}
                  style={{ marginTop: 6, border: "none", background: pickColor(p), color: "#fff", cursor: "pointer", padding: "5px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
                  {t.details} →
                </button>
              </Popup>
            </Marker>
          ))}

          {eventPins.map((e, i) => (
            <Marker key={"e" + e.id + i} position={[e.lat, e.lng]} icon={catIcon((CATS[e.cat] || { c: P.cobalt }).c)}>
              <Popup>
                <strong style={{ fontFamily: "Georgia, serif" }}>{e.title[lang]}</strong>
                {e.venue && <><br /><span style={{ color: "#6B5D4F" }}>{e.venue}</span></>}
                {stay && <><br /><span style={{ color: "#2F7A63", fontWeight: 600 }}>{walkLabel(e.lat, e.lng)}</span></>}
                <br />
                <button onClick={() => onOpenEvent(e)}
                  style={{ marginTop: 6, border: "none", background: (CATS[e.cat] || { c: P.cobalt }).c, color: "#fff", cursor: "pointer", padding: "5px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
                  {t.details} →
                </button>
              </Popup>
            </Marker>
          ))}

          {stay && (
            <Marker position={stay} icon={stayIcon()}>
              <Popup>
                <strong style={{ fontFamily: "Georgia, serif" }}>{lang === "es" ? "Dónde te hospedas" : "Where you're staying"}</strong>
                <br />
                <button onClick={() => setStay(null)}
                  style={{ marginTop: 6, border: "none", background: P.navy, color: "#fff", cursor: "pointer", padding: "5px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
                  {lang === "es" ? "Quitar" : "Remove"}
                </button>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}

/* ---- Event card -------------------------------------------------- */
function EventCard({ e, lang, t, P, saved, onSave, onOpen }) {
  const cat = CATS[e.cat];
  const Ic = cat.Icon;
  const sD = d(e.start);

  return (
    <article className="card" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onOpen(); } }}
      style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 16, overflow: "hidden", display: "flex", cursor: "pointer" }}>
      {/* Date rail */}
      <div style={{ background: cat.c, color: "#fff", width: 62, flexShrink: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "10px 4px", gap: 4 }}>
        <Ic size={16} style={{ opacity: .9 }} />
        <span className="disp" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{sD.getDate()}</span>
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>{MONTHS[lang][sD.getMonth()]}</span>
      </div>

      <div style={{ padding: "13px 14px", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: cat.c, textTransform: "uppercase", letterSpacing: ".03em" }}>{cat[lang]}</span>
            {e.recurring && <span style={{ fontSize: 11, color: P.inkSoft, display: "flex", alignItems: "center", gap: 3 }}>
              <Repeat size={11} /> {t.recurs}</span>}
          </div>
          <button onClick={(ev) => { ev.stopPropagation(); onSave(); }} aria-label={t.savedTip} aria-pressed={saved}
            style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, flexShrink: 0 }}>
            <Heart size={20} color={P.coral} fill={saved ? P.coral : "none"} />
          </button>
        </div>

        <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 700, margin: "5px 0 6px", lineHeight: 1.18, letterSpacing: "-.01em" }}>{e.title[lang]}</h3>
        <p style={{ fontSize: 13.5, color: P.inkSoft, margin: "0 0 10px", lineHeight: 1.45 }}>{e.blurb[lang]}</p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12.5, color: P.inkSoft }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={13} /> {e.venue} · {e.area}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={13} /> {dateLabelFor(e, lang, t)}{e.time ? ` · ${e.time}` : ""}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Ticket size={13} /> {e.price[lang]}</span>
        </div>

        {e.origin && (
          <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${P.line}`, fontSize: 11.5, color: P.inkSoft }}>
            {t.source}: <span style={{ color: P.cobalt, fontWeight: 600 }}>{e.origin.name}</span>
          </div>
        )}
      </div>

      {/* Thumbnail */}
      <Media img={e.img} cat={e.cat} iconSize={26}
        style={{ width: 96, flexShrink: 0, alignSelf: "stretch", height: "auto" }} />
    </article>
  );
}

/* ---- Filter groups (shared by desktop inline + mobile sheet) ----- */
const GREEN = "#2F7A63";
function FilterGroups({ favType, setFavType, favCuisine, setFavCuisine, favDiet, setFavDiet, lang, t, P }) {
  const flip = (setter, set, k) => setter(() => { const s = new Set(set); s.has(k) ? s.delete(k) : s.add(k); return s; });
  const clearType = (k) => { setFavType(k); if (k !== "rest") { setFavCuisine(new Set()); setFavDiet(new Set()); } };
  const Label = ({ children }) => (
    <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: P.inkSoft, margin: "0 0 8px" }}>{children}</div>
  );
  const base = { cursor: "pointer", borderRadius: 999, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 };
  const cuisines = Object.keys(CUISINES).filter((k) => !GOODFOR.includes(k)).sort((a, b) => CUISINES[a][lang].localeCompare(CUISINES[b][lang]));
  const active = favType !== "" || favCuisine.size > 0 || favDiet.size > 0;
  const clearAll = () => { setFavType(""); setFavCuisine(new Set()); setFavDiet(new Set()); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
      {active && (
        <button onClick={clearAll}
          style={{ alignSelf: "flex-start", cursor: "pointer", border: `1px solid ${P.line}`, background: P.chipBg, color: P.inkSoft, fontWeight: 600, fontSize: 12.5, padding: "5px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <X size={13} /> {lang === "es" ? "Limpiar filtros" : "Clear filters"}
        </button>
      )}
      <div>
        <Label>{lang === "es" ? "Tipo" : "Type"}</Label>
        <div className="catrow">
          <button onClick={() => clearType("")}
            style={{ ...base, padding: "7px 15px", fontSize: 14, fontWeight: 700, border: `1px solid ${favType === "" ? P.cobalt : P.line}`, background: favType === "" ? P.cobalt : P.chipBg, color: favType === "" ? "#fff" : P.ink }}>{t.all}</button>
          {TYPE_ORDER.map((k) => {
            const on = favType === k; const Ic = PLACE_TYPE[k].Icon;
            return (
              <button key={k} onClick={() => clearType(on ? "" : k)}
                style={{ ...base, padding: "7px 15px", fontSize: 14, fontWeight: 700, border: `1px solid ${on ? P.cobalt : P.line}`, background: on ? P.cobalt : P.chipBg, color: on ? "#fff" : P.ink }}>
                <Ic size={15} /> {TYPE_LABEL_PLURAL[k][lang]}
              </button>
            );
          })}
        </div>
      </div>

      {favType === "rest" && (
        <div>
          <Label>{lang === "es" ? "Cocina" : "Cuisine"}</Label>
          <div className="catrow">
            {cuisines.map((k) => {
              const on = favCuisine.has(k); const Ic = CUISINES[k].Icon;
              return (
                <button key={k} onClick={() => flip(setFavCuisine, favCuisine, k)}
                  style={{ ...base, padding: "5px 12px", fontSize: 13, fontWeight: 600, border: `1px solid ${on ? P.coral : P.line}`, background: on ? P.coral : P.chipBg, color: on ? "#fff" : P.inkSoft }}>
                  <Ic size={13} /> {CUISINES[k][lang]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(favType === "rest" || EXPERIENTIAL_TYPES.includes(favType)) && (
        <div>
          <Label>{lang === "es" ? "Ideal para" : "Good for"}</Label>
          <div className="catrow">
            {(favType === "rest" ? GOODFOR : ["family", "playground", "groups", "livemusic", "views"]).map((k) => {
              const on = favCuisine.has(k); const Ic = CUISINES[k].Icon;
              return (
                <button key={k} onClick={() => flip(setFavCuisine, favCuisine, k)}
                  style={{ ...base, padding: "5px 12px", fontSize: 13, fontWeight: 600, border: `1px solid ${on ? GREEN : "#CFE3D6"}`, background: on ? GREEN : "#EEF5F0", color: on ? "#fff" : GREEN }}>
                  <Ic size={13} /> {CUISINES[k][lang]}
                </button>
              );
            })}
            {favType === "rest" && Object.entries(DIET).map(([k, dt]) => {
              const on = favDiet.has(k); const Ic = dt.Icon;
              return (
                <button key={k} onClick={() => flip(setFavDiet, favDiet, k)}
                  style={{ ...base, padding: "5px 12px", fontSize: 13, fontWeight: 600, border: `1px solid ${on ? GREEN : "#CFE3D6"}`, background: on ? GREEN : "#EEF5F0", color: on ? "#fff" : GREEN }}>
                  <Ic size={13} /> {dt[lang]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Place card (Local Picks + Saved) ---------------------------- */
const PLACE_TYPE = {
  rest: { en: "Restaurant", es: "Restaurante", Icon: Utensils },
  bar: { en: "Bar", es: "Bar", Icon: Wine },
  live: { en: "Venue", es: "Lugar", Icon: Palette },
  market: { en: "Market", es: "Mercado", Icon: ShoppingBasket },
  wellness: { en: "Wellness", es: "Bienestar", Icon: Waves },
  parks: { en: "Park", es: "Parque", Icon: Trees },
  culture: { en: "Arts & Culture", es: "Arte y cultura", Icon: Drama },
  shopping: { en: "Shopping", es: "Compras", Icon: ShoppingBag },
};

function PlaceCard({ it, lang, t, P, saved, onSave, onOpen }) {
  const cat = CATS[it.cat] || { c: P.coral, es: "", en: "", Icon: Utensils };
  const ty = PLACE_TYPE[it.list_key] || PLACE_TYPE.rest;
  const Bi = ty.Icon;
  const cuisineKeys = it.list_key === "rest" ? (it.cuisine || []) : [];
  const primaryCuisine = cuisineKeys.find((c) => !GOODFOR.includes(c) && CUISINES[c]);
  const goodforKeys = cuisineKeys.filter((c) => GOODFOR.includes(c));
  const dietKey = (it.diet || []).includes("vegan") ? "vegan" : (it.diet || []).includes("vegetarian") ? "vegetarian" : null;
  // A café reads better than "Restaurant" when coffee is its primary cuisine.
  const typeLabel = primaryCuisine === "cafe" ? "Café" : ty[lang];
  // Extra badge icons (after the type icon): cuisine, good-for facets, dietary.
  const extraIcons = [
    primaryCuisine && CUISINES[primaryCuisine].Icon,
    ...goodforKeys.map((k) => CUISINES[k].Icon),
    dietKey && DIET[dietKey].Icon,
  ].filter(Boolean);
  const badgeTitle = [typeLabel, primaryCuisine && CUISINES[primaryCuisine][lang], ...goodforKeys.map((k) => CUISINES[k][lang]), dietKey && DIET[dietKey][lang]].filter(Boolean).join(" · ");
  const galleryCount = (it.img ? 1 : 0) + (it.photos ? it.photos.length : 0);
  return (
    <div className="card placecard" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => { if (onOpen && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(); } }}
      aria-label={it.name}
      style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", cursor: onOpen ? "pointer" : "default" }}>
      <div style={{ position: "relative" }}>
        <Media img={it.img} cat={it.cat} iconSize={30} style={{ width: "100%", height: 150 }} />
        <span title={badgeTitle}
          style={{ position: "absolute", top: 10, left: 10, height: 30, width: extraIcons.length ? "auto" : 30, padding: extraIcons.length ? "0 9px" : 0, borderRadius: extraIcons.length ? 999 : "50%", background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 1px 5px rgba(0,0,0,.18)" }}>
          <Bi size={15} color={cat.c} />
          {extraIcons.length > 0 && <span style={{ width: 1, height: 15, background: "rgba(0,0,0,.13)" }} />}
          {extraIcons.map((Ic, i) => <Ic key={i} size={15} color={cat.c} />)}
        </span>
        {galleryCount > 1 && (
          <span style={{ position: "absolute", bottom: 10, right: 10, display: "flex", alignItems: "center", gap: 4, background: "rgba(13,20,40,.7)", color: "#fff", fontSize: 11.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999 }}>
            <ImageIcon size={12} /> {galleryCount}
          </span>
        )}
        <button onClick={(e) => { e.stopPropagation(); onSave(); }} aria-label={t.savedTip} aria-pressed={saved}
          style={{ position: "absolute", top: 10, right: 10, border: "none", cursor: "pointer",
            width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.92)",
            display: "grid", placeItems: "center", boxShadow: "0 1px 5px rgba(0,0,0,.18)" }}>
          <Heart size={17} color={P.coral} fill={saved ? P.coral : "none"} />
        </button>
      </div>
      <div style={{ padding: "12px 15px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: cat.c, textTransform: "uppercase", letterSpacing: ".05em" }}>{typeLabel}</span>
        <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 700, margin: "3px 0 5px", lineHeight: 1.15, letterSpacing: "-.01em" }}>{it.name}</h3>
        {it[lang] && <p style={{ fontSize: 13, color: P.inkSoft, margin: "0 0 10px", lineHeight: 1.45 }}>{it[lang]}</p>}
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: P.inkSoft }}>
          <MapPin size={12} /> {areaLabel(it, lang)}
          {it.diet && it.diet.length > 0 && <span style={{ color: P.agave || "#2F7A63", fontWeight: 700, marginLeft: 6 }}>· {it.diet.includes("vegan") ? "Vegan" : "Veg"}</span>}
        </div>
      </div>
    </div>
  );
}

/* ---- Place detail sheet (Local Picks) ---------------------------- */
function PlaceDetail({ it, lang, t, P, saved, onSave, onClose }) {
  const ty = PLACE_TYPE[it.list_key] || PLACE_TYPE.rest;
  const gallery = [it.img, ...(it.photos || [])].filter(Boolean);
  const [idx, setIdx] = useState(0);
  const cur = gallery[Math.min(idx, gallery.length - 1)];

  useEffect(() => {
    const onKey = (ev) => { if (ev.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tagItems = [
    ...(it.cuisine || []).map((c) => CUISINES[c] && { label: CUISINES[c][lang], Icon: CUISINES[c].Icon }),
    ...(it.diet || []).map((d) => DIET[d] && { label: DIET[d][lang], Icon: DIET[d].Icon }),
    ...(it.audience || []).map((a) => AUDIENCES[a] && { label: AUDIENCES[a][lang], Icon: AUDIENCES[a].Icon }),
  ].filter(Boolean);
  const priceStr = it.price ? "$".repeat(Math.max(1, Math.min(4, it.price))) : null;
  const es = lang === "es";

  const Row = ({ icon: Bi, children, href }) => {
    const inner = (<><span style={{ flexShrink: 0, marginTop: 1, color: P.inkSoft }}><Bi size={16} /></span><span>{children}</span></>);
    const style = { display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: P.ink, padding: "9px 0", borderTop: `1px solid ${P.line}`, lineHeight: 1.4 };
    return href
      ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ ...style, textDecoration: "none", color: P.cobalt, fontWeight: 600 }}>{inner}</a>
      : <div style={style}>{inner}</div>;
  };

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={it.name}
      style={{ position: "fixed", inset: 0, background: P.scrim, display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}>
      <div className="sheet" onClick={(ev) => ev.stopPropagation()}
        style={{ background: P.sheet, color: P.ink, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,.28)" }}>
        {/* Hero gallery */}
        <div style={{ position: "relative" }}>
          <Media img={cur} cat={it.cat} iconSize={56} style={{ width: "100%", height: 220 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,.4), rgba(0,0,0,0) 40%)" }} />
          <button onClick={onClose} aria-label={t.back}
            style={{ position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center", boxShadow: "0 1px 6px rgba(0,0,0,.25)" }}>
            <X size={18} color={P.ink} />
          </button>
          {gallery.length > 1 && (
            <>
              <button onClick={() => setIdx((i) => (i - 1 + gallery.length) % gallery.length)} aria-label="Previous photo"
                style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(255,255,255,.85)", display: "grid", placeItems: "center" }}>
                <ChevronLeft size={18} color={P.ink} />
              </button>
              <button onClick={() => setIdx((i) => (i + 1) % gallery.length)} aria-label="Next photo"
                style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(255,255,255,.85)", display: "grid", placeItems: "center" }}>
                <ChevronRight size={18} color={P.ink} />
              </button>
              <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5 }}>
                {gallery.map((_, i) => (
                  <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === idx ? "#fff" : "rgba(255,255,255,.5)" }} />
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: "16px 18px 22px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: P.coral, textTransform: "uppercase", letterSpacing: ".05em" }}>
                {ty[lang]}{priceStr && <span style={{ color: P.inkSoft, marginLeft: 8 }}>{priceStr}</span>}
              </span>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 24, margin: "3px 0 4px", lineHeight: 1.12 }}>{it.name}</h2>
              <p style={{ margin: 0, fontSize: 13.5, color: P.inkSoft, display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} /> {areaLabel(it, lang)}</p>
            </div>
            <button onClick={onSave} aria-pressed={saved}
              style={{ flexShrink: 0, border: `1px solid ${saved ? P.coral : P.line}`, cursor: "pointer", background: saved ? P.coral : P.chipBg, color: saved ? "#fff" : P.ink, fontWeight: 700, fontSize: 13.5, padding: "9px 14px", borderRadius: 11, display: "flex", alignItems: "center", gap: 6 }}>
              <Heart size={15} fill={saved ? "#fff" : "none"} /> {saved ? (es ? "Guardado" : "Saved") : (es ? "Guardar" : "Save")}
            </button>
          </div>

          {/* Tags */}
          {tagItems.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "13px 0 4px" }}>
              {tagItems.map((tg, i) => { const TI = tg.Icon; return (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: P.inkSoft, background: P.chipBg, border: `1px solid ${P.line}`, padding: "4px 10px", borderRadius: 999 }}>{TI && <TI size={12} />}{tg.label}</span>
              ); })}
            </div>
          )}

          {it[lang] && <p style={{ fontSize: 15, lineHeight: 1.55, color: P.ink, margin: "14px 0 6px" }}>{it[lang]}</p>}

          {/* Editorial — the hand-picked voice */}
          {(it.whyLove?.[lang] || it.whatToOrder?.[lang] || it.bestTime?.[lang]) && (
            <div style={{ margin: "8px 0 4px", display: "grid", gap: 12 }}>
              {it.whyLove?.[lang] && (
                <div>
                  <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: P.coral, margin: "0 0 3px" }}>{es ? "Por qué nos encanta" : "Why we love it"}</p>
                  <p style={{ fontSize: 14.5, lineHeight: 1.55, color: P.ink, margin: 0 }}>{it.whyLove[lang]}</p>
                </div>
              )}
              {it.whatToOrder?.[lang] && (
                <div>
                  <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: P.coral, margin: "0 0 3px" }}>{es ? "Qué pedir" : "What to order"}</p>
                  <p style={{ fontSize: 14.5, lineHeight: 1.55, color: P.ink, margin: 0 }}>{it.whatToOrder[lang]}</p>
                </div>
              )}
              {it.bestTime?.[lang] && (
                <p style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, color: P.inkSoft, margin: 0 }}>
                  <Clock3 size={14} style={{ flexShrink: 0 }} />
                  <span><strong style={{ color: P.ink }}>{es ? "Mejor momento" : "Best time"}:</strong> {it.bestTime[lang]}</span>
                </p>
              )}
            </div>
          )}

          {it.tip?.[lang] && (
            <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: "#FBF5E9", border: `1px solid ${P.marigold}55`, borderRadius: 12, padding: "11px 13px", margin: "10px 0 4px" }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: 1, color: "#B4791F" }} />
              <span style={{ fontSize: 13.5, color: P.ink, lineHeight: 1.45 }}><strong>{es ? "Bueno saber" : "Good to know"}:</strong> {it.tip[lang]}</span>
            </div>
          )}

          {/* Attribute chips (from Google Places) — only show the ones that are true */}
          {(() => {
            const a = it.attrs || {};
            const keys = Object.keys(ATTR_LABELS).filter((k) => a[k] === true);
            if (!keys.length) return null;
            return (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {keys.map((k) => (
                  <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: "#2F7A63", background: "#EEF5F0", border: "1px solid #CFE3D6", borderRadius: 999, padding: "4px 11px" }}>
                    <Check size={12} /> {ATTR_LABELS[k][lang]}
                  </span>
                ))}
              </div>
            );
          })()}

          {/* Practical info */}
          <div style={{ marginTop: 14 }}>
            {(() => {
              const st = openStatus(it.hoursJson, lang);
              const week = it.hoursJson && it.hoursJson.weekday_text;
              if (!st && !week && !it.hours) return null;
              return (
                <details style={{ marginBottom: 4 }}>
                  <summary style={{ display: "flex", alignItems: "center", gap: 9, cursor: week ? "pointer" : "default", listStyle: "none", fontSize: 14, color: P.inkSoft, padding: "5px 0" }}>
                    <Clock3 size={15} style={{ flexShrink: 0, color: P.inkSoft }} />
                    {st && <span style={{ fontWeight: 700, color: st.open ? "#2F7A63" : "#C0554E" }}>{st.text}</span>}
                    {st && (week || it.hours) && <span style={{ color: "#B9AE9C" }}>·</span>}
                    <span>{it.hours || (es ? "Ver horario" : "See hours")}</span>
                  </summary>
                  {week && (
                    <div style={{ padding: "6px 0 4px 24px", display: "grid", gap: 2 }}>
                      {week.map((line, i) => <span key={i} style={{ fontSize: 13, color: P.inkSoft }}>{line}</span>)}
                    </div>
                  )}
                </details>
              );
            })()}
            {it.phone && <Row icon={Phone} href={`tel:${it.phone}`}>{it.phone}</Row>}
            {it.website && <Row icon={Globe} href={it.website}>{es ? "Sitio web" : "Website"}</Row>}
            {it.mapsUrl && <Row icon={MapPin} href={it.mapsUrl}>{es ? "Abrir en Google Maps" : "Open in Google Maps"}</Row>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Event detail sheet ------------------------------------------ */
function EventDetail({ e, lang, t, P, saved, onSave, onClose }) {
  const cat = CATS[e.cat];
  const Ic = cat.Icon;
  const [copied, setCopied] = useState(false);
  const shareUrl = e.origin?.url || (typeof window !== "undefined" ? window.location.href : "");

  useEffect(() => {
    const onKey = (ev) => { if (ev.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onShare = async () => {
    const shareData = { title: e.title[lang], text: e.title[lang], url: shareUrl };
    if (navigator.share) { try { await navigator.share(shareData); } catch { /* dismissed */ } }
    else if (navigator.clipboard) {
      try { await navigator.clipboard.writeText(`${e.title[lang]} — ${shareUrl}`); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
    }
  };

  const Btn = ({ onClick, href, icon: Bi, label, primary }) => {
    const style = {
      display: "flex", alignItems: "center", justifyContent: "center", gap: 7, cursor: "pointer",
      padding: "11px 12px", borderRadius: 12, fontSize: 13.5, fontWeight: 600, textDecoration: "none",
      border: primary ? "none" : `1px solid ${P.line}`,
      background: primary ? P.cobalt : P.chipBg, color: primary ? "#fff" : P.ink,
    };
    return href
      ? <a href={href} target="_blank" rel="noopener noreferrer" style={style}><Bi size={16} /> {label}</a>
      : <button onClick={onClick} style={style}><Bi size={16} /> {label}</button>;
  };

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={e.title[lang]}
      style={{ position: "fixed", inset: 0, background: P.scrim, display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}>
      <div className="sheet" onClick={(ev) => ev.stopPropagation()}
        style={{ background: P.sheet, color: P.ink, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto",
          borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,.28)" }}>
        {/* Hero image with overlaid category chip + close */}
        <div style={{ position: "relative" }}>
          <Media img={e.img} cat={e.cat} iconSize={56} style={{ width: "100%", height: 190 }} />
          <div style={{ position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,.45), rgba(0,0,0,0) 42%)" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "14px 16px",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#fff",
              background: cat.c, padding: "5px 11px", borderRadius: 999, boxShadow: "0 2px 8px rgba(0,0,0,.25)" }}>
              <Ic size={15} />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{cat[lang]}</span>
              {e.recurring && <span style={{ fontSize: 11, opacity: .95, display: "flex", alignItems: "center", gap: 3 }}>
                <Repeat size={12} /> {t.recurs}</span>}
            </div>
            <button onClick={onClose} aria-label={t.back}
              style={{ border: "none", background: "rgba(0,0,0,.5)", color: "#fff", cursor: "pointer",
                width: 32, height: 32, borderRadius: 999, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: "16px 18px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <h2 className="disp" style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px", lineHeight: 1.15 }}>{e.title[lang]}</h2>
            <button onClick={onSave} aria-label={t.savedTip} aria-pressed={saved}
              style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, flexShrink: 0, marginTop: 4 }}>
              <Heart size={24} color={P.rosa} fill={saved ? P.rosa : "none"} />
            </button>
          </div>

          <div style={{ display: "grid", gap: 8, marginBottom: 14, fontSize: 14, color: P.inkSoft }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Clock size={15} color={cat.c} /> {dateLabelFor(e, lang, t)}{e.time ? ` · ${e.time}` : ""}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}><MapPin size={15} color={cat.c} /> {e.venue} · {e.area}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Ticket size={15} color={cat.c} /> {e.price[lang]}</span>
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.55, margin: "0 0 16px", color: P.ink }}>{e.blurb[lang]}</p>

          {/* Mini map */}
          {e.lat && e.lng && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ border: `1px solid ${P.line}`, borderRadius: 14, overflow: "hidden", height: 180 }}>
                <MapContainer center={[e.lat, e.lng]} zoom={15} style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={false} dragging={false} doubleClickZoom={false} zoomControl={false} attributionControl={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[e.lat, e.lng]} icon={catIcon(cat.c)} />
                </MapContainer>
              </div>
              <p style={{ fontSize: 11.5, color: P.inkSoft, margin: "6px 2px 0" }}>{t.approxLoc}</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 14 }}>
            <Btn href={gcalUrl(e, lang)} icon={CalendarPlus} label={t.addCal} primary />
            <Btn onClick={onShare} icon={copied ? Check : Share2} label={copied ? t.copied : t.share} />
          </div>
          {e.origin?.url && (
            <div style={{ marginTop: 9 }}>
              <a href={e.origin.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 12px",
                  borderRadius: 12, border: `1px solid ${P.line}`, background: P.chipBg, color: P.cobalt, fontSize: 13.5, fontWeight: 600, textDecoration: "none" }}>
                <ExternalLink size={16} /> {t.viewSource} · {e.origin.name}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
