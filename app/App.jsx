"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Heart, Search, MapPin, Clock, Ticket, Globe, Repeat, X,
  Music, Clapperboard, Footprints, Users, MessagesSquare, ShoppingBasket, Waves,
  Map as MapIcon, List as ListIcon, CalendarPlus, Share2, ExternalLink,
  Moon, Sun, Check, Baby, Backpack, Sprout, Salad,
  Utensils, Wine, Palette, Trees, Drama, ShoppingBag, Home, Sparkles,
  Images as ImageIcon, Phone, Clock3, DollarSign, Info, ChevronLeft, ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { nearestNeighborhood, neighborhoodRegions, kmFromCentro, kmBetween, IN_TOWN_KM } from "../lib/neighborhoods";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchEvents, fetchPlaces } from "../lib/supabase";
import { CUISINES, GOODFOR } from "../components/cuisines";
import GuidesDropdown from "../components/GuidesDropdown";
import MobileGuidesTab from "../components/MobileGuidesTab";

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
    none: "No hay eventos con esos filtros.", noneHint: "Prueba quitar un filtro o buscar otra cosa.", placesNone: "No hay lugares con esos filtros.",
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
    none: "No events match those filters.", noneHint: "Try removing a filter or searching for something else.", placesNone: "No places match those filters.",
    source: "Source", recurs: "Recurring", savedTip: "Save",
    favNote: "Sample data — these get replaced by your real Google Maps lists.",
    footer: "Prototype · sample data. Personalization and the 1–2 hr radius come later.",
    dateThru: "–", listView: "List", mapView: "Map",
    todayHero: "on today in San Miguel", weekendHero: "this weekend", seeToday: "See today",
    addCal: "Add to calendar", share: "Share", viewSource: "View source",
    copied: "Link copied!", details: "Details", allCats: "All categories",
    approxLoc: "Approximate location", back: "Back" },
};

// Anchor every event date filter to the real current day (recomputed each page load), so
// "past", "Today", "This weekend" and "This week" stay correct without a hardcoded date.
const _now = new Date();
const TODAY = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate());
const d = (s) => { const [y, m, day] = s.split("-").map(Number); return new Date(y, m - 1, day); };
const overlaps = (aS, aE, bS, bE) => aS <= bE && bS <= aE;
// This weekend = the nearest Sat+Sun. On Sunday, still counts the Sat just passed so
// today's events show; any other day points at the upcoming Saturday and Sunday.
const _dow = TODAY.getDay(); // 0 Sun ... 6 Sat
const _satOffset = _dow === 0 ? -1 : (6 - _dow);
const WEEKEND_S = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + _satOffset);
const WEEKEND_E = new Date(WEEKEND_S.getFullYear(), WEEKEND_S.getMonth(), WEEKEND_S.getDate() + 1);
// This week = today through the next 7 days.
const WEEK_E = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 7);

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

const WEEKDAY_FULL = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  es: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
};
// Human label for a recurring event's weekdays. Falls back to a generic "recurring" label
// when we don't yet know the days (recurDays empty).
function recurLabel(days, lang, t) {
  const es = lang === "es";
  const set = Array.isArray(days) ? [...new Set(days)].filter((n) => n >= 0 && n <= 6).sort((a, b) => a - b) : [];
  if (!set.length) return t.recurs || (es ? "Cada semana" : "Weekly");
  if (set.length === 7) return es ? "Todos los días" : "Daily";
  if (set.length === 5 && [1, 2, 3, 4, 5].every((x) => set.includes(x))) return es ? "Entre semana" : "Weekdays";
  if (set.length === 2 && set.includes(0) && set.includes(6)) return es ? "Fines de semana" : "Weekends";
  const names = set.map((dd) => WEEKDAY_FULL[lang][dd]);
  return es ? names.join(", ") : names.map((n) => n + "s").join(", ");
}

// The best available "when" for a recurring event: the human-readable note if we have one
// (handles monthly etc.), otherwise a label derived from the known weekdays, otherwise generic.
function recurWhen(e, lang, t) {
  const note = e.recurNote && (e.recurNote[lang] || e.recurNote.en);
  return note || recurLabel(e.recurDays, lang, t);
}
// Do we actually know the schedule (vs. just "it recurs")?
const recurKnown = (e) => !!(e.recurNote && (e.recurNote.en || e.recurNote.es)) || (Array.isArray(e.recurDays) && e.recurDays.length > 0);

// True when a recurring event has a concrete upcoming occurrence date (rolled forward from the
// source); false when its date is stale/unknown and we should show the generic schedule instead.
// The concrete upcoming date an event happens on, used for display, filtering and sorting:
// a real/rolled future date (or today if a multi-day event is already underway), else computed
// from its recurrence weekdays, else null when we genuinely cannot place it.
function nextOccurrence(e) {
  const sD = d(e.start), eD = d(e.end);
  if (!isNaN(eD) && eD >= TODAY && !isNaN(sD)) return sD < TODAY ? TODAY : sD; // dated / in-progress
  if (e.recurring && Array.isArray(e.recurDays) && e.recurDays.length) {
    for (let i = 0; i < 7; i++) {
      const c = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + i);
      if (e.recurDays.includes(c.getDay())) return c; // soonest upcoming matching weekday
    }
  }
  return null;
}
const hasNextDate = (e) => e.recurring && !!nextOccurrence(e);
// Sort key: events we cannot date sort as today so a stale original date never jumps them up.
const effEventDate = (e) => nextOccurrence(e) || TODAY;

const dayName = (dt, lang) => WEEKDAY_FULL[lang][dt.getDay()];
function dateLabelFor(e, lang, t) {
  const sD = d(e.start), eD = d(e.end);
  const occ = nextOccurrence(e);
  // Recurring event we cannot place on a date: show its schedule ("Every Wed", "Monthly").
  if (e.recurring && !occ) return recurWhen(e, lang, t);
  const multi = e.start !== e.end;
  const end = `${eD.getDate()} ${MONTHS[lang][eD.getMonth()]}`;
  // A multi-day event already underway: lead with that it is on now, and when it ends.
  if (multi && sD <= TODAY && eD >= TODAY) return lang === "es" ? `En curso, hasta el ${end}` : `On now, through ${end}`;
  if (multi) return `${sD.getDate()} ${MONTHS[lang][sD.getMonth()]} ${t.dateThru} ${end}`;
  // Single-day: for a recurring event, show its computed next occurrence with the weekday.
  if (e.recurring && occ) return `${dayName(occ, lang)} ${occ.getDate()} ${MONTHS[lang][occ.getMonth()]}`;
  return `${sD.getDate()} ${MONTHS[lang][sD.getMonth()]}`;
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
/* ---- Walking paths: numbered map circuit you build, save, share, and plan around --- */
const walkPinIcon = (n) => L.divIcon({
  className: "",
  html: `<div style="background:#E06A63;color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 13px system-ui;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)">${n}</div>`,
  iconSize: [26, 26], iconAnchor: [13, 13],
});
function WalkClickCatcher({ onAdd }) { useMapEvents({ click(e) { onAdd(e.latlng.lat, e.latlng.lng); } }); return null; }
// Client-side path length in km (haversine sum), for the live builder readout.
function walkKm(points) {
  const R = 6371, tr = (x) => (x * Math.PI) / 180; let m = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const dLat = tr(b.lat - a.lat), dLng = tr(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(tr(a.lat)) * Math.cos(tr(b.lat)) * Math.sin(dLng / 2) ** 2;
    m += 2 * R * Math.asin(Math.sqrt(s));
  }
  return m;
}

// Read-only (or click-to-add) map of a path: numbered markers joined by a circuit line.
function WalkMap({ points, height = 260, onAdd }) {
  const center = points.length ? [points[0].lat, points[0].lng] : [20.9145, -100.7436];
  const line = points.map((p) => [p.lat, p.lng]);
  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden", border: "1px solid #E7DDCB" }}>
      <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {onAdd && <WalkClickCatcher onAdd={onAdd} />}
        {line.length > 1 && <Polyline positions={line} pathOptions={{ color: "#E06A63", weight: 4, opacity: 0.85 }} />}
        {points.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]} icon={walkPinIcon(i + 1)}>
            {(p.label || p.note) && <Tooltip>{p.label || `#${i + 1}`}{p.note ? ` — ${p.note}` : ""}</Tooltip>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

// Builder modal: click the map to drop stops, label/reorder them, name and save the walk.
function WalkBuilder({ onClose, onSaved, lang, P }) {
  const es = lang === "es";
  const [points, setPoints] = useState([]);
  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const addPoint = (lat, lng) => setPoints((p) => [...p, { lat, lng, label: "", note: "" }]);
  const setLabel = (i, v) => setPoints((p) => p.map((x, j) => (j === i ? { ...x, label: v } : x)));
  const move = (i, d) => setPoints((p) => { const n = [...p]; const j = i + d; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const remove = (i) => setPoints((p) => p.filter((_, j) => j !== i));
  async function save() {
    setErr("");
    if (!name.trim()) return setErr(es ? "Ponle nombre a tu caminata." : "Name your walk.");
    if (points.length < 2) return setErr(es ? "Agrega al menos dos paradas." : "Add at least two stops on the map.");
    setBusy(true);
    try {
      const r = await fetch("/api/walking-paths", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), author: author.trim(), summary: summary.trim(), points }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Failed to save");
      onSaved(j.path);
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(13,20,40,.55)", display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto", padding: "24px 14px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: P.plaster, borderRadius: 20, maxWidth: 680, width: "100%", padding: "20px", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 className="disp" style={{ fontFamily: "Georgia, serif", fontSize: 22, margin: 0, color: P.ink }}>🚶 {es ? "Arma una caminata" : "Build a walk"}</h2>
          <button onClick={onClose} style={{ border: "none", background: P.chipBg, cursor: "pointer", width: 34, height: 34, borderRadius: "50%", fontSize: 18, color: P.inkSoft }}>×</button>
        </div>
        <p style={{ fontSize: 13.5, color: P.inkSoft, margin: "0 0 10px" }}>{es ? "Toca el mapa para agregar paradas en orden. Etiqueta cada una." : "Tap the map to drop stops in order, then label each one."}</p>
        <WalkMap points={points} height={280} onAdd={addPoint} />
        {points.length > 1 && (
          <p style={{ fontSize: 13, color: P.cobalt, fontWeight: 700, margin: "8px 0 0" }}>
            {walkKm(points).toFixed(1)} km · ~{Math.round(walkKm(points) * 12)} min {es ? "a pie" : "walk"} · {points.length} {es ? "paradas" : "stops"}
          </p>
        )}
        {points.length > 0 && (
          <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
            {points.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: P.coral, color: "#fff", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                <input value={p.label} onChange={(e) => setLabel(i, e.target.value)} placeholder={es ? `Parada ${i + 1} (ej. Parroquia)` : `Stop ${i + 1} (e.g. Parroquia)`}
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 9, border: `1px solid ${P.line}`, fontSize: 13.5, background: P.card, color: P.ink }} />
                <button onClick={() => move(i, -1)} disabled={i === 0} title="Up" style={{ border: "none", background: "transparent", cursor: "pointer", color: P.inkSoft, fontSize: 13 }}>▲</button>
                <button onClick={() => move(i, 1)} disabled={i === points.length - 1} title="Down" style={{ border: "none", background: "transparent", cursor: "pointer", color: P.inkSoft, fontSize: 13 }}>▼</button>
                <button onClick={() => remove(i)} title="Remove" style={{ border: "none", background: "transparent", cursor: "pointer", color: P.coral, fontSize: 15 }}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={es ? "Nombre de la caminata" : "Walk name (e.g. Centro art loop)"}
            style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${P.line}`, fontSize: 14, fontWeight: 700, background: P.card, color: P.ink }} />
          <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={es ? "Breve descripción (opcional)" : "Short description (optional)"}
            style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${P.line}`, fontSize: 13.5, background: P.card, color: P.ink }} />
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={es ? "Tu nombre (opcional)" : "Your name (optional)"}
            style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${P.line}`, fontSize: 13.5, background: P.card, color: P.ink }} />
        </div>
        {err && <p style={{ color: P.coral, fontSize: 13, margin: "8px 0 0" }}>{err}</p>}
        <button onClick={save} disabled={busy} style={{ marginTop: 12, width: "100%", border: "none", background: busy ? P.inkSoft : P.coral, color: "#fff", cursor: busy ? "default" : "pointer", fontWeight: 800, fontSize: 15, padding: "12px", borderRadius: 12 }}>
          {busy ? (es ? "Guardando…" : "Saving…") : (es ? "Guardar y compartir" : "Save walk")}
        </button>
      </div>
    </div>
  );
}

// Distance/time/elevation summary chips for a walk.
function walkStats(path, es) {
  const parts = [];
  if (path.distance_m != null) {
    const km = path.distance_m / 1000;
    parts.push(km < 1 ? `${Math.round(path.distance_m)} m` : `${km.toFixed(1)} km`);
    const mins = Math.round(km * 12); // ~12 min per km walking
    if (mins) parts.push(`${mins} min`);
  }
  if (path.elev_gain_m != null && path.elev_gain_m > 0) parts.push(`↑ ${path.elev_gain_m} m`);
  return parts;
}

// A card for a walk in the library or Saved page: route picture + stats + save/share.
function WalkCard({ path, lang, P, saved, onToggleSave, onShare, onPlan, shareMsg }) {
  const es = lang === "es";
  const n = (path.points || []).length;
  const stats = walkStats(path, es);
  return (
    <div style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ position: "relative" }}>
        {path.id
          ? <img src={`/api/walk-map?id=${path.id}`} alt={path.name} loading="lazy" style={{ width: "100%", height: 200, objectFit: "cover", display: "block", background: "#EAE3D4" }} />
          : <WalkMap points={path.points || []} height={200} />}
        {path.official && (
          <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10.5, fontWeight: 800, color: "#fff", background: "#B4791F", padding: "3px 9px", borderRadius: 999, boxShadow: "0 2px 6px rgba(0,0,0,.3)" }}>
            ★ {es ? "Oficial" : "Official"}
          </span>
        )}
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, margin: 0, color: P.ink }}>{path.name}</h3>
          <span style={{ fontSize: 12, color: P.inkSoft, whiteSpace: "nowrap" }}>{n} {es ? "paradas" : "stops"}</span>
        </div>
        {stats.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {stats.map((s, i) => <span key={i} style={{ fontSize: 12, fontWeight: 700, color: P.cobalt, background: P.chipBg, border: `1px solid ${P.line}`, padding: "2px 9px", borderRadius: 999 }}>{s}</span>)}
          </div>
        )}
        {path.summary && <p style={{ fontSize: 13.5, color: P.inkSoft, lineHeight: 1.45, margin: "5px 0 0" }}>{path.summary}</p>}
        {path.author && <p style={{ fontSize: 12, color: P.inkSoft, margin: "5px 0 0", fontStyle: "italic" }}>{es ? "Por" : "By"} {path.author}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button onClick={onToggleSave} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${saved ? P.coral : P.line}`, background: saved ? P.coral : P.chipBg, color: saved ? "#fff" : P.inkSoft, cursor: "pointer", fontWeight: 700, fontSize: 13, padding: "7px 13px", borderRadius: 999 }}>
            <Heart size={13} /> {saved ? (es ? "Guardado" : "Saved") : (es ? "Guardar" : "Save")}
          </button>
          <button onClick={onShare} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${P.cobalt}`, background: P.chipBg, color: P.cobalt, cursor: "pointer", fontWeight: 700, fontSize: 13, padding: "7px 13px", borderRadius: 999 }}>
            <Share2 size={13} /> {shareMsg || (es ? "Compartir" : "Share")}
          </button>
          <a href={(() => {
            const origin = typeof window !== "undefined" ? window.location.origin : "";
            const stops = (path.points || []).map((p, i) => `${i + 1}. ${p.label || "Stop " + (i + 1)}`).join("%0D%0A");
            const subject = encodeURIComponent(`${path.name} — a San Miguel walk`);
            const body = `${encodeURIComponent(path.summary || "")}%0D%0A%0D%0A${stops}%0D%0A%0D%0A${encodeURIComponent(origin + "/?walk=" + path.id)}`;
            return `mailto:?subject=${subject}&body=${body}`;
          })()} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${P.line}`, background: P.chipBg, color: P.inkSoft, textDecoration: "none", fontWeight: 700, fontSize: 13, padding: "7px 13px", borderRadius: 999 }}>
            ✉ {es ? "Correo" : "Email"}
          </a>
          {onPlan && (
            <button onClick={onPlan} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: P.cobalt, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, padding: "7px 13px", borderRadius: 999 }}>
              ✨ {es ? "Planear alrededor" : "Plan around it"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Library view: browse community walks, create one, save/share/plan around them.
function WalksView({ lang, P, savedWalks, onToggleSave, onShare, shareMsg, onCreate, sharedWalk, onPlan }) {
  const es = lang === "es";
  const [lib, setLib] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { const r = await fetch("/api/walking-paths"); const j = await r.json(); if (j.ok) setLib(j.paths || []); } catch {} setLoading(false); })(); }, []);
  const savedIds = new Set(savedWalks.map((w) => w.id));
  const list = sharedWalk ? [sharedWalk, ...lib.filter((p) => p.id !== sharedWalk.id)] : lib;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <h2 className="disp" style={{ fontSize: 22, fontFamily: "Georgia, serif", margin: 0, color: P.ink }}>{es ? "Caminatas" : "Walking paths"}</h2>
        <button onClick={onCreate} style={{ border: "none", background: P.coral, color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 14, padding: "10px 16px", borderRadius: 11 }}>🚶 {es ? "Arma una caminata" : "Build a walk"}</button>
      </div>
      <p style={{ fontSize: 14, color: P.inkSoft, margin: "0 0 16px", maxWidth: "60ch", lineHeight: 1.5 }}>{es ? "Rutas a pie hechas por la comunidad. Guarda las que te gusten, compártelas o arma tu viaje alrededor de una." : "Community walking routes. Save the ones you like, share them, or plan a day around one."}</p>
      {sharedWalk && <p style={{ fontSize: 13, color: P.cobalt, fontWeight: 700, margin: "0 0 12px" }}>{es ? "Alguien te compartió esta caminata:" : "Someone shared this walk with you:"}</p>}
      {loading ? <p style={{ color: P.inkSoft }}>{es ? "Cargando…" : "Loading…"}</p>
        : list.length === 0 ? <p style={{ color: P.inkSoft }}>{es ? "Aún no hay caminatas. ¡Crea la primera!" : "No walks yet. Build the first one!"}</p>
        : <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {list.map((p) => <WalkCard key={p.id} path={p} lang={lang} P={P} saved={savedIds.has(p.id)} onToggleSave={() => onToggleSave(p)} onShare={() => onShare(p)} onPlan={() => onPlan(p)} shareMsg={shareMsg[p.id]} />)}
          </div>}
    </div>
  );
}

function TripPlanner({ onClose, stay, savedNames, lang, t, P, onOpenPick, onOpenEvent, onSaveAll, existingItinerary, onRefine, walk }) {
  const es = lang === "es";
  const [choosing, setChoosing] = useState(!!existingItinerary); // ask start-over vs refine when a plan exists
  const [days, setDays] = useState(3);
  const [startDate, setStartDate] = useState(""); // optional trip start (YYYY-MM-DD), cross-references events
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

  // Conversational tweak on the freshly generated (not yet saved) plan.
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const thinkList = THINK_MSGS(es);
  const [thinkIdx, setThinkIdx] = useState(0);
  useEffect(() => { if (!chatBusy) return; const id = setInterval(() => setThinkIdx((i) => (i + 1) % thinkList.length), 1400); return () => clearInterval(id); }, [chatBusy]);
  async function chatSend() {
    const msg = chatInput.trim(); if (!msg || chatBusy || !result) return;
    setChatInput(""); setChatBusy(true);
    const history = messages.slice(-8);
    setMessages((m) => [...m, { role: "user", content: msg }]);
    try {
      const ctx = { days, party, pace, interests: [...interests], stay: stay || null, startDate: startDate || null, mustInclude: savedNames || [] };
      const r = await fetch("/api/plan-chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: result, userMessage: msg, history, context: ctx, lang }) });
      const j = await r.json();
      if (j.ok) {
        setMessages((m) => [...m, { role: "assistant", content: j.reply || (es ? "Listo." : "Done.") }]);
        if (j.changed && j.itinerary?.days?.length) setResult((prev) => ({ ...prev, summary: j.itinerary.summary || prev.summary, days: j.itinerary.days }));
      } else setMessages((m) => [...m, { role: "assistant", content: es ? "Perdón, no pude con eso." : "Sorry, I couldn't do that." }]);
    } catch { setMessages((m) => [...m, { role: "assistant", content: es ? "Error de red." : "Network error." }]); }
    setChatBusy(false);
  }

  const PARTIES = [["couple", es ? "Pareja" : "Couple"], ["family with kids", es ? "Familia" : "Family"], ["friends", es ? "Amigos" : "Friends"], ["solo", es ? "Solo" : "Solo"]];
  const PACES = [["relaxed", es ? "Relajado" : "Relaxed"], ["balanced", es ? "Balanceado" : "Balanced"], ["packed", es ? "Intenso" : "Packed"]];
  const INTERESTS = [["food", es ? "Comida" : "Food"], ["cafes", es ? "Cafés" : "Cafés"], ["art", es ? "Arte" : "Art"], ["culture", es ? "Cultura" : "Culture"], ["outdoors", es ? "Aire libre" : "Outdoors"], ["nightlife", es ? "Vida nocturna" : "Nightlife"], ["wellness", es ? "Bienestar" : "Wellness"], ["shopping", es ? "Compras" : "Shopping"]];
  const toggleI = (k) => setInterests((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  async function generate() {
    setLoading(true); setError(""); setResult(null);
    try {
      // Family is implied by "who's coming", so fold it in automatically rather than as a chip.
      const sendInterests = party === "family with kids" ? [...new Set([...interests, "family"])] : [...interests];
      const r = await fetch("/api/plan-trip", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, party, pace, interests: sendInterests, stay: stay || null, mustInclude: savedNames || [], startDate: startDate || null, walk: walk ? { name: walk.name, points: walk.points } : null, lang }) });
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

        {choosing && !result && !loading && (
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: P.ink, margin: 0 }}>
              {es ? "Ya tienes un viaje guardado. ¿Qué prefieres?" : "You already have a saved trip. What would you like to do?"}
            </p>
            <button onClick={() => onRefine && onRefine()}
              style={{ border: "none", background: P.coral, color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 15, padding: "13px", borderRadius: 12, textAlign: "left" }}>
              💬 {es ? "Ajustar mi viaje actual (conversando)" : "Refine my current trip (by chat)"}
              <span style={{ display: "block", fontWeight: 500, fontSize: 12.5, opacity: .9, marginTop: 2 }}>{es ? "Mantén tu horario y solo dime qué cambiar." : "Keep your schedule and just tell me what to change."}</span>
            </button>
            <button onClick={() => setChoosing(false)}
              style={{ border: `1px solid ${P.line}`, background: P.chipBg, color: P.ink, cursor: "pointer", fontWeight: 700, fontSize: 14.5, padding: "12px", borderRadius: 12, textAlign: "left" }}>
              ✨ {es ? "Empezar un plan nuevo" : "Start a new plan"}
              <span style={{ display: "block", fontWeight: 500, fontSize: 12.5, color: P.inkSoft, marginTop: 2 }}>{es ? "Reemplaza el itinerario guardado." : "Replaces your saved itinerary."}</span>
            </button>
          </div>
        )}

        {loading && (
          <div style={{ padding: "40px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 44, animation: "qp-pulse 1.4s ease-in-out infinite" }}>✨</div>
            <div style={{ margin: "18px auto 0", width: 34, height: 34, borderRadius: "50%", border: `3px solid ${P.line}`, borderTopColor: P.coral, animation: "qp-spin .8s linear infinite" }} />
            <p style={{ marginTop: 18, fontSize: 15, fontWeight: 700, color: P.ink }}>{LOAD_MSGS[loadMsg]}</p>
            <p style={{ marginTop: 4, fontSize: 12.5, color: P.inkSoft }}>{es ? "Suele tardar unos segundos." : "This usually takes a few seconds."}</p>
          </div>
        )}

        {!result && !loading && !choosing && (
          <div style={{ display: "grid", gap: 16 }}>
            {walk && (
              <div style={{ background: P.chipBg, border: `1px solid ${P.cobalt}55`, borderRadius: 12, padding: "10px 13px", fontSize: 13.5, color: P.ink }}>
                🚶 {es ? "Planeando alrededor de la caminata" : "Planning around the walk"} <strong>{walk.name}</strong>. {es ? "Sumaremos recomendaciones cerca de la ruta." : "We'll weave in picks near the route."}
              </div>
            )}
            <div>
              <p style={label2(P)}>{es ? "Días" : "Days"}</p>
              <div style={{ display: "flex", gap: 7 }}>{[1, 2, 3, 4, 5].map((d) => <button key={d} onClick={() => setDays(d)} style={pill(days === d, P.cobalt)}>{d}</button>)}</div>
            </div>
            <div>
              <p style={label2(P)}>{es ? "¿Cuándo? (opcional)" : "When? (optional)"}</p>
              <input type="date" value={startDate} min={new Date().toLocaleDateString("en-CA")} onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", background: P.card, color: P.ink }} />
              <p style={{ fontSize: 12, color: P.inkSoft, margin: "6px 0 0" }}>
                {es ? "Elige una fecha y cruzaremos los eventos y mercados de esos días." : "Pick a date and we'll line up events and weekday markets happening then."}
              </p>
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

        {result && (() => {
          const chatProps = { es, P, messages, input: chatInput, setInput: setChatInput, busy: chatBusy, send: chatSend, thinkMsg: thinkList[thinkIdx] };
          const emailProps = { es, P, email, setEmail, emailIt, emailMsg, emailing };
          return (
          <div>
            {result.summary && <p style={{ fontSize: 14.5, lineHeight: 1.55, color: P.ink, margin: "0 0 16px" }}>{result.summary}</p>}

            {/* Ask/tweak + email at the top */}
            <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
              <ChatPanel {...chatProps} />
              <EmailBar {...emailProps} />
            </div>

            {result.days.map((d) => (
              <div key={d.day} style={{ marginBottom: 18 }}>
                <h3 className="disp" style={{ fontSize: 16, fontWeight: 800, color: P.ink, margin: "0 0 8px" }}>
                  {dayHeading(d.day, startDate, d.title, lang)}
                </h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {d.items.map((it, i) => (
                    <button key={i} onClick={() => it.kind === "event" ? onOpenEvent(it.name) : onOpenPick(it.name)}
                      style={{ textAlign: "left", border: `1px solid ${P.line}`, background: P.card, borderRadius: 12, padding: "11px 13px", cursor: "pointer", display: "flex", gap: 11, alignItems: "flex-start" }}>
                      {it.photo_url && <img src={it.photo_url} alt="" loading="lazy" style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 9, objectFit: "cover" }} />}
                      <span style={{ flex: 1 }}>
                        <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "#fff", background: it.kind === "event" ? P.cobalt : P.coral, padding: "3px 8px", borderRadius: 999, marginBottom: 4 }}>
                          {(SLOT_LABEL[it.slot] || { en: it.slot, es: it.slot })[lang]}
                        </span>
                        <span style={{ display: "block", fontWeight: 700, color: P.ink, fontSize: 14.5 }}>{it.name}</span>
                        {it.why && <span style={{ display: "block", fontSize: 13, color: P.inkSoft, lineHeight: 1.45, marginTop: 2 }}>{it.why}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <button onClick={() => onSaveAll(result, { days, party, pace, interests: [...interests], stay: stay || null, mustInclude: savedNames || [], startDate: startDate || null })} style={{ border: "none", background: P.cobalt, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14, padding: "11px 18px", borderRadius: 11 }}>
                {es ? "Guardar itinerario" : "Save this itinerary"}
              </button>
              <button onClick={() => { setResult(null); }} style={{ border: `1px solid ${P.line}`, background: P.chipBg, cursor: "pointer", color: P.inkSoft, fontWeight: 700, fontSize: 14, padding: "11px 18px", borderRadius: 11 }}>
                {es ? "Empezar de nuevo" : "Start over"}
              </button>
            </div>

            {/* Ask/tweak + email again at the bottom */}
            <div style={{ display: "grid", gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${P.line}` }}>
              <ChatPanel {...chatProps} />
              <EmailBar {...emailProps} />
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
const label2 = (P) => ({ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: P.inkSoft, margin: "0 0 7px" });

// Rotating "thinking" phrases for the itinerary chat (both the planner popup and Saved).
const THINK_MSGS = (es) => es
  ? ["Pensando…", "Revisando tu itinerario…", "Buscando mejores opciones…", "Ajustando los tiempos…"]
  : ["Thinking…", "Reviewing your itinerary…", "Weighing better options…", "Adjusting the timing…"];

// "Day 2: Tuesday, Aug 18 · Title" when a start date is known, else "Day 2 · Title".
function dayHeading(dayNum, startDate, title, lang) {
  const es = lang === "es";
  let base = es ? `Día ${dayNum}` : `Day ${dayNum}`;
  if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    const [y, m, d] = startDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + (dayNum - 1));
    const wd = dt.toLocaleDateString(es ? "es-MX" : "en-US", { weekday: "long" });
    const md = dt.toLocaleDateString(es ? "es-MX" : "en-US", { month: "short", day: "numeric" });
    base += `: ${wd.charAt(0).toUpperCase() + wd.slice(1)}, ${md}`;
  }
  return title ? `${base} · ${title}` : base;
}

// Reusable conversational tweak panel (shared by the planner popup + Saved itinerary).
function ChatPanel({ es, P, messages, input, setInput, busy, send, thinkMsg }) {
  return (
    <div style={{ padding: "13px 14px", background: P.plaster, border: `1px solid ${P.line}`, borderRadius: 12 }}>
      <p style={{ ...label2(P), margin: "0 0 8px" }}>💬 {es ? "Pregunta o ajusta tu plan" : "Ask or tweak your plan"}</p>
      {messages.length > 0 && (
        <div style={{ display: "grid", gap: 7, marginBottom: 10, maxHeight: 240, overflowY: "auto" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ justifySelf: m.role === "user" ? "end" : "start", maxWidth: "85%", fontSize: 13.5, lineHeight: 1.45, padding: "8px 12px", borderRadius: 12,
              background: m.role === "user" ? P.cobalt : P.card, color: m.role === "user" ? "#fff" : P.ink, border: m.role === "user" ? "none" : `1px solid ${P.line}` }}>{m.content}</div>
          ))}
          {busy && (
            <div style={{ justifySelf: "start", display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: P.coral, padding: "8px 12px" }}>
              <span style={{ width: 15, height: 15, borderRadius: "50%", border: `2px solid ${P.line}`, borderTopColor: P.coral, display: "inline-block", animation: "qp-spin .8s linear infinite" }} />
              {thinkMsg}
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder={es ? "p. ej. haz el día 2 más relajado" : "e.g. make day 2 more relaxed and meandering"}
          style={{ flex: 1, padding: "11px 13px", borderRadius: 11, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", background: P.card, color: P.ink }} />
        <button onClick={send} disabled={busy || !input.trim()} style={{ border: "none", background: busy || !input.trim() ? P.inkSoft : P.coral, color: "#fff", cursor: busy ? "default" : "pointer", fontWeight: 700, fontSize: 14, padding: "11px 18px", borderRadius: 11 }}>{es ? "Enviar" : "Send"}</button>
      </div>
    </div>
  );
}

// Reusable "email me the itinerary" row.
function EmailBar({ es, P, email, setEmail, emailIt, emailMsg, emailing }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" onKeyDown={(e) => { if (e.key === "Enter") emailIt(); }}
        placeholder={es ? "Envíatelo: tu@correo.com" : "Email the itinerary: you@email.com"}
        style={{ flex: 1, minWidth: 170, padding: "9px 12px", borderRadius: 10, border: `1px solid ${P.line}`, fontSize: 13.5, fontFamily: "inherit", background: P.card, color: P.ink }} />
      <button onClick={emailIt} disabled={emailing || !email.trim()} style={{ border: `1px solid ${P.cobalt}`, background: P.chipBg, cursor: emailing ? "default" : "pointer", color: P.cobalt, fontWeight: 700, fontSize: 13, padding: "9px 15px", borderRadius: 10 }}>
        {emailing ? (es ? "Enviando…" : "Sending…") : (es ? "Enviar por correo" : "Email me")}
      </button>
      {emailMsg && <span style={{ fontSize: 12.5, color: emailMsg.includes("!") ? P.green : P.coral }}>{emailMsg}</span>}
    </div>
  );
}

// Saved itinerary shown as a day planner, with a chat to ask questions / tweak it in place.
function SavedItinerary({ itin, setItin, lang, t, P, onOpenPick, onOpenEvent, savedNames, photoFor, weaveIn, onWove }) {
  const es = lang === "es";
  const [messages, setMessages] = useState([]); // {role, content}
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [emailing, setEmailing] = useState(false);
  const thinkList = THINK_MSGS(es);
  const [thinkIdx, setThinkIdx] = useState(0);
  useEffect(() => { if (!busy) return; const id = setInterval(() => setThinkIdx((i) => (i + 1) % thinkList.length), 1400); return () => clearInterval(id); }, [busy]);

  async function runChat(msg) {
    if (!msg || busy) return;
    setBusy(true);
    const history = messages.slice(-8);
    setMessages((m) => [...m, { role: "user", content: msg }]);
    try {
      const r = await fetch("/api/plan-chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: itin, userMessage: msg, history, context: { ...(itin._ctx || {}), mustInclude: savedNames && savedNames.length ? savedNames : (itin._ctx?.mustInclude || []) }, lang }) });
      const j = await r.json();
      if (j.ok) {
        setMessages((m) => [...m, { role: "assistant", content: j.reply || (es ? "Listo." : "Done.") }]);
        if (j.changed && j.itinerary?.days?.length) setItin({ ...j.itinerary, _ctx: itin._ctx });
      } else setMessages((m) => [...m, { role: "assistant", content: es ? "Perdón, no pude con eso." : "Sorry, I couldn't do that." }]);
    } catch { setMessages((m) => [...m, { role: "assistant", content: es ? "Error de red." : "Network error." }]); }
    setBusy(false);
  }
  async function send() { const msg = input.trim(); if (!msg) return; setInput(""); await runChat(msg); }

  // "Make it a day plan" then "Refine": auto-ask the AI to weave the just-saved spots in.
  useEffect(() => {
    if (!weaveIn || !weaveIn.length) return;
    const names = weaveIn.slice(0, 12);
    if (onWove) onWove(); // consume once
    const msg = es
      ? `Acabo de guardar estos lugares: ${names.join(", ")}. Intégralos en el itinerario donde encajen y ajusta lo necesario.`
      : `I just saved these spots: ${names.join(", ")}. Please weave them into the itinerary where they fit and adjust as needed.`;
    runChat(msg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weaveIn]);
  async function emailIt() {
    if (!email.trim()) return; setEmailing(true); setEmailMsg("");
    try {
      const r = await fetch("/api/email-itinerary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: email.trim(), itinerary: itin, lang }) });
      const j = await r.json(); setEmailMsg(j.ok ? (es ? "¡Enviado!" : "Sent!") : (es ? "No se pudo." : "Couldn't send."));
    } catch { setEmailMsg(es ? "Error." : "Error."); }
    setEmailing(false);
  }
  const startDate = itin._ctx?.startDate || null;
  const chatProps = { es, P, messages, input, setInput, busy, send, thinkMsg: thinkList[thinkIdx] };
  const emailProps = { es, P, email, setEmail, emailIt, emailMsg, emailing };

  return (
    <section style={{ marginBottom: 26, background: P.card, border: `1px solid ${P.line}`, borderRadius: 16, padding: "18px 18px 14px" }}>
      <style>{`@keyframes qp-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h2 className="disp" style={{ fontFamily: "Georgia, serif", fontSize: 20, margin: 0, color: P.ink }}>✨ {es ? "Tu itinerario" : "Your itinerary"}</h2>
        <button onClick={() => { setItin(null); }} style={{ border: `1px solid ${P.line}`, background: P.chipBg, cursor: "pointer", color: P.inkSoft, fontWeight: 600, fontSize: 12.5, padding: "5px 12px", borderRadius: 999 }}>{es ? "Borrar" : "Clear"}</button>
      </div>
      {itin.summary && <p style={{ fontSize: 14, lineHeight: 1.55, color: P.inkSoft, margin: "0 0 14px" }}>{itin.summary}</p>}

      {/* Chat + email at the top so they are the first things you can do. */}
      <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        <ChatPanel {...chatProps} />
        <EmailBar {...emailProps} />
      </div>

      {itin.days.map((d) => (
        <div key={d.day} style={{ marginBottom: 16 }}>
          <h3 className="disp" style={{ fontSize: 15.5, fontWeight: 800, color: P.ink, margin: "0 0 8px" }}>{dayHeading(d.day, startDate, d.title, lang)}</h3>
          <div style={{ display: "grid", gap: 7 }}>
            {d.items.map((it, i) => {
              const photo = it.photo_url || (photoFor && it.kind !== "event" ? photoFor(it.name) : null);
              return (
              <button key={i} onClick={() => it.kind === "event" ? onOpenEvent(it.name) : onOpenPick(it.name)}
                style={{ textAlign: "left", border: `1px solid ${P.line}`, background: P.plaster, borderRadius: 10, padding: "9px 12px", cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start" }}>
                {photo && <img src={photo} alt="" loading="lazy" style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />}
                <span style={{ flex: 1 }}>
                  <span style={{ display: "inline-block", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "#fff", background: it.kind === "event" ? P.cobalt : P.coral, padding: "3px 7px", borderRadius: 999, marginBottom: 3 }}>
                    {(SLOT_LABEL[it.slot] || { en: it.slot, es: it.slot })[lang]}
                  </span>
                  <span style={{ display: "block", fontWeight: 700, color: P.ink, fontSize: 14 }}>{it.name}</span>
                  {it.why && <span style={{ display: "block", fontSize: 12.5, color: P.inkSoft, lineHeight: 1.4, marginTop: 1 }}>{it.why}</span>}
                </span>
              </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Chat + email again at the bottom, after the full plan. */}
      <div style={{ display: "grid", gap: 10, marginTop: 8, paddingTop: 14, borderTop: `1px dashed ${P.line}` }}>
        <ChatPanel {...chatProps} />
        <EmailBar {...emailProps} />
      </div>
    </section>
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

/* ---- Home hero: ask Vamos AI, get a saveable shortlist ------------------------- */
function HomeAsk({ lang, P, favLists, savedPlaces, onToggleSave, onOpenPick, onOpenPlanner }) {
  const es = lang === "es";
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const CHIPS = es
    ? ["cena en rooftop", "café tranquilo y galerías", "mejores tacos", "algo romántico", "primera vez, 3 días"]
    : ["rooftop dinner", "quiet coffee + galleries", "best tacos al pastor", "something romantic", "first time, 3 days"];
  const LOAD = es
    ? ["Pensando como local…", "Buscando lo mejor para ti…", "Afinando tu lista…"]
    : ["Thinking like a local…", "Finding the best fits…", "Polishing your shortlist…"];
  const [loadIdx, setLoadIdx] = useState(0);
  useEffect(() => { if (!loading) return; const id = setInterval(() => setLoadIdx((i) => (i + 1) % LOAD.length), 1400); return () => clearInterval(id); }, [loading]);
  const pickByName = (name) => favLists.flatMap((l) => l.items || []).find((x) => x.name === name);

  async function ask(query) {
    const s = (query ?? q).trim(); if (!s || loading) return;
    setQ(s); setLoading(true); setErr(""); setResult(null);
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: s, lang }) });
      const j = await r.json();
      if (j.ok && j.items) setResult({ intro: j.intro, items: j.items, query: s });
      else setErr(j.error || (es ? "No pude con eso. Intenta de nuevo." : "Couldn't do that. Try again."));
    } catch { setErr(es ? "Error de red." : "Network error."); }
    setLoading(false);
  }

  return (
    <section style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 18, padding: "20px 20px 18px", marginBottom: 26, boxShadow: "0 6px 24px rgba(13,20,40,.06)" }}>
      <style>{`@keyframes qp-spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 14, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: P.coral, margin: "0 0 10px" }}>✨ {es ? "Pregúntale a Vamos AI" : "Ask Vamos AI"}</p>
      <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(22px, 3.4vw, 30px)", margin: "0 0 12px", lineHeight: 1.12, color: P.ink }}>
        {es ? "Dime qué buscas en San Miguel y te doy la lista corta." : "Tell me what you're looking for in San Miguel. I'll give you the short list."}
      </h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
          placeholder={es ? "p. ej. cena en rooftop con vista al atardecer" : "e.g. rooftop dinner with a sunset view"}
          style={{ flex: 1, minWidth: 220, padding: "13px 15px", borderRadius: 12, border: `1px solid ${P.line}`, fontSize: 15.5, fontFamily: "inherit", background: P.plaster, color: P.ink }} />
        <button onClick={() => ask()} disabled={loading || !q.trim()}
          style={{ border: "none", background: P.coral, color: "#fff", cursor: loading || !q.trim() ? "default" : "pointer", opacity: loading || !q.trim() ? 0.8 : 1, fontWeight: 800, fontSize: 15.5, padding: "13px 24px", borderRadius: 12, whiteSpace: "nowrap" }}>
          {es ? "Buscar" : "Ask"}
        </button>
      </div>
      {!result && !loading && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
          {CHIPS.map((c) => (
            <button key={c} onClick={() => ask(c)} style={{ border: `1px solid ${P.line}`, background: P.chipBg, color: P.inkSoft, cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "6px 13px", borderRadius: 999 }}>{c}</button>
          ))}
        </div>
      )}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, color: P.coral, fontWeight: 700, fontSize: 14.5 }}>
          <span style={{ width: 17, height: 17, borderRadius: "50%", border: `2px solid ${P.line}`, borderTopColor: P.coral, display: "inline-block", animation: "qp-spin .8s linear infinite" }} />
          {LOAD[loadIdx]}
        </div>
      )}
      {err && <p style={{ color: P.coral, fontSize: 13.5, margin: "12px 0 0" }}>{err}</p>}
      {result && (
        <div style={{ marginTop: 16 }}>
          {result.intro && <p style={{ fontSize: 14.5, lineHeight: 1.5, color: P.ink, margin: "0 0 12px" }}>{result.intro}</p>}
          {result.items.length === 0 && <p style={{ color: P.inkSoft, fontSize: 14 }}>{es ? "No encontré algo que encaje. Prueba otra cosa." : "Nothing matched. Try another ask."}</p>}
          <div style={{ display: "grid", gap: 10 }}>
            {result.items.map((it, i) => {
              const saved = savedPlaces.has(it.name);
              return (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: P.plaster, border: `1px solid ${P.line}`, borderRadius: 12, padding: "10px 12px" }}>
                  {it.photo_url && <img src={it.photo_url} alt="" loading="lazy" onClick={() => onOpenPick(it.name)} style={{ width: 60, height: 60, borderRadius: 9, objectFit: "cover", flexShrink: 0, cursor: "pointer" }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button onClick={() => onOpenPick(it.name)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, textAlign: "left", fontWeight: 800, fontSize: 15, color: P.ink }}>{it.name}</button>
                    {it.area && <span style={{ fontSize: 12, color: P.inkSoft, marginLeft: 8 }}>{it.area}</span>}
                    {it.why && <p style={{ fontSize: 13, color: P.inkSoft, lineHeight: 1.45, margin: "3px 0 0" }}>{it.why}</p>}
                  </div>
                  <button onClick={() => onToggleSave(it.name)} title={saved ? (es ? "Guardado" : "Saved") : (es ? "Guardar" : "Save")}
                    style={{ flexShrink: 0, border: `1px solid ${saved ? P.coral : P.line}`, background: saved ? P.coral : P.chipBg, color: saved ? "#fff" : P.inkSoft, cursor: "pointer", borderRadius: 999, width: 34, height: 34, display: "grid", placeItems: "center" }}>
                    <Heart size={15} fill={saved ? "#fff" : "none"} />
                  </button>
                </div>
              );
            })}
          </div>
          {result.items.length > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <button onClick={() => { result.items.forEach((it) => { if (!savedPlaces.has(it.name)) onToggleSave(it.name); }); }}
                style={{ border: "none", background: P.cobalt, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13.5, padding: "10px 16px", borderRadius: 11 }}>
                <Heart size={13} /> {es ? "Guardar todo" : "Save all to my trip"}
              </button>
              <button onClick={() => { result.items.forEach((it) => { if (!savedPlaces.has(it.name)) onToggleSave(it.name); }); onOpenPlanner(result.items.map((it) => it.name)); }}
                style={{ border: `1px solid ${P.coral}`, background: P.chipBg, color: P.coral, cursor: "pointer", fontWeight: 700, fontSize: 13.5, padding: "10px 16px", borderRadius: 11 }}>
                ✨ {es ? "Hazlo un plan del día" : "Make it a day plan"}
              </button>
              <button onClick={() => { setResult(null); setQ(""); }} style={{ border: `1px solid ${P.line}`, background: P.chipBg, color: P.inkSoft, cursor: "pointer", fontWeight: 700, fontSize: 13.5, padding: "10px 16px", borderRadius: 11 }}>
                {es ? "Preguntar otra cosa" : "Ask something else"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ---- Home best-of rails: one decisive winner per intent + "and 2 more" ---------- */
function BestOfRails({ lang, P, savedPlaces, onToggleSave, onOpenPick }) {
  const es = lang === "es";
  const [cats, setCats] = useState([]);
  useEffect(() => { (async () => { try { const r = await fetch("/api/best-of"); const j = await r.json(); if (j.ok) setCats((j.categories || []).filter((c) => c.winner)); } catch {} })(); }, []);
  if (!cats.length) return null;
  return (
    <section style={{ marginBottom: 30 }}>
      <h2 className="disp" style={{ fontFamily: "Georgia, serif", fontSize: 22, margin: "0 0 4px", color: P.ink }}>{es ? "Los mejores, elegidos" : "The best of, decided"}</h2>
      <p style={{ fontSize: 13.5, color: P.inkSoft, margin: "0 0 16px" }}>{es ? "Un ganador por antojo. Elegidos por locales, nunca patrocinados." : "One winner per craving. Chosen by locals, never sponsored."}</p>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {cats.map((c) => {
          const w = c.winner;
          const saved = savedPlaces.has(w.name);
          return (
            <div key={c.slug} style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "relative" }}>
                {w.photo_url
                  ? <img src={w.photo_url} alt="" loading="lazy" onClick={() => onOpenPick(w.name)} style={{ width: "100%", height: 160, objectFit: "cover", display: "block", cursor: "pointer", background: P.chipBg }} />
                  : <div style={{ height: 58, background: `linear-gradient(135deg, ${P.coral}, ${P.marigold})` }} />}
                <a href={`/best/${c.slug.replace(/^best_/, "").replace(/_/g, "-")}`} title={es ? "Ver la lista completa" : "See the full list"}
                  style={{ position: "absolute", top: 12, left: 12, display: "inline-flex", alignItems: "center", gap: 5, background: P.coral, color: "#fff", fontWeight: 800, fontSize: 12.5, letterSpacing: ".03em", textTransform: "uppercase", padding: "6px 13px", borderRadius: 999, boxShadow: "0 3px 12px rgba(13,20,40,.4)", textDecoration: "none" }}>
                  ★ {(es && c.label_es) ? c.label_es : c.label_en}
                </a>
              </div>
              <div style={{ padding: "14px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <button onClick={() => onOpenPick(w.name)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, textAlign: "left", fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: P.ink, lineHeight: 1.15 }}>{w.name}</button>
                  <button onClick={() => onToggleSave(w.name)} title={saved ? (es ? "Guardado" : "Saved") : (es ? "Guardar" : "Save")}
                    style={{ flexShrink: 0, border: `1px solid ${saved ? P.coral : P.line}`, background: saved ? P.coral : P.chipBg, color: saved ? "#fff" : P.inkSoft, cursor: "pointer", borderRadius: 999, width: 32, height: 32, display: "grid", placeItems: "center" }}>
                    <Heart size={14} fill={saved ? "#fff" : "none"} />
                  </button>
                </div>
                {(w.local_take || w.desc_en) && <p style={{ fontSize: 13, color: P.inkSoft, lineHeight: 1.45, margin: "6px 0 0" }}>{(w.local_take || w.desc_en).slice(0, 130)}</p>}
                {c.runners && c.runners.length > 0 && (
                  <div style={{ marginTop: "auto", paddingTop: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: P.inkSoft, margin: "0 0 7px" }}>{es ? "También excelentes" : "Also great"}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {c.runners.map((r) => (
                        <button key={r.name} onClick={() => onOpenPick(r.name)} style={{ display: "flex", alignItems: "center", gap: 9, border: `1px solid ${P.line}`, background: P.plaster, cursor: "pointer", borderRadius: 10, padding: "6px 8px", textAlign: "left" }}>
                          {r.photo_url
                            ? <img src={r.photo_url} alt="" loading="lazy" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} />
                            : <span style={{ width: 30, height: 30, borderRadius: 7, background: P.chipBg, flexShrink: 0 }} />}
                          <span style={{ fontSize: 13, fontWeight: 700, color: P.ink }}>{r.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function App() {
  const [lang, setLang] = useState("en");
  const [theme, setTheme] = useState("light");
  const [view, setView] = useState("faves");
  const [eventLayout, setEventLayout] = useState("list"); // list | map
  const [picksLayout, setPicksLayout] = useState("list"); // list | map (Local Picks)
  const [savedLayout, setSavedLayout] = useState("list"); // list | map (Saved trip)
  const [expandedLists, setExpandedLists] = useState(() => new Set()); // per-list "show all" on the Picks home
  const [seeAll, setSeeAll] = useState(false); // reveal the full browse under the AI-first home
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
  const [favPrice, setFavPrice] = useState(new Set()); // price tiers 1/2/3 to include
  const [dateF, setDateF] = useState("all");
  const [saved, setSaved] = useState(() => loadSet("qp_saved_events"));
  const [savedPlaces, setSavedPlaces] = useState(() => loadSet("qp_saved_places"));
  const [detail, setDetail] = useState(null); // event object or null
  const [placeDetail, setPlaceDetail] = useState(null); // pick object or null
  const [pendingPlaceName, setPendingPlaceName] = useState(null); // pick to open once lists load (from /?place=)
  const [filterSheet, setFilterSheet] = useState(false); // mobile filter sheet
  const [events, setEvents] = useState(SEED_EVENTS);
  const [favLists, setFavLists] = useState(SEED_FAV_LISTS);
  // Walking paths: device-saved list, builder modal, a link-shared walk, and share status.
  const [savedWalks, setSavedWalks] = useState(() => { try { return JSON.parse(localStorage.getItem("qp_saved_walks") || "[]"); } catch { return []; } });
  const [showWalkBuilder, setShowWalkBuilder] = useState(false);
  const [sharedWalk, setSharedWalk] = useState(null);
  const [walkShareMsg, setWalkShareMsg] = useState({});
  const [plannerWalk, setPlannerWalk] = useState(null); // a walk to plan a day around
  const [pendingWeave, setPendingWeave] = useState([]); // shortlist names to weave in on refine
  const t = T[lang];
  const P = PALETTES[theme];

  useEffect(() => { try { localStorage.setItem("qp_saved_walks", JSON.stringify(savedWalks)); } catch {} }, [savedWalks]);
  const toggleSaveWalk = (path) => setSavedWalks((w) => w.some((x) => x.id === path.id) ? w.filter((x) => x.id !== path.id) : [...w, path]);
  async function shareWalk(path) {
    const url = `${window.location.origin}/?walk=${path.id}`;
    try { if (navigator.share) { await navigator.share({ title: path.name, url }); return; } } catch {}
    try { await navigator.clipboard.writeText(url); setWalkShareMsg((m) => ({ ...m, [path.id]: lang === "es" ? "¡Copiado!" : "Copied!" })); setTimeout(() => setWalkShareMsg((m) => ({ ...m, [path.id]: "" })), 2500); }
    catch { setWalkShareMsg((m) => ({ ...m, [path.id]: url })); }
  }
  function planAroundWalk(path) { setPlannerWalk(path); setShowWalkBuilder(false); setShowPlanner(true); }

  useEffect(() => { localStorage.setItem("qp_saved_events", JSON.stringify([...saved])); }, [saved]);
  useEffect(() => { localStorage.setItem("qp_saved_places", JSON.stringify([...savedPlaces])); }, [savedPlaces]);

  // When a saved place is removed and it's in the current itinerary, drop it and ask the
  // planner to backfill a replacement for that day (they un-chose it, so it should go).
  const prevSavedRef = useRef(null);
  useEffect(() => {
    const cur = savedPlaces;
    const prev = prevSavedRef.current;
    prevSavedRef.current = new Set(cur);
    if (prev == null || !savedItinerary) return; // skip first run / no plan
    const removed = [...prev].filter((n) => !cur.has(n));
    if (!removed.length) return;
    const gone = new Set();
    savedItinerary.days.forEach((d) => (d.items || []).forEach((it) => { if (it.kind !== "event" && removed.includes(it.name)) gone.add(it.name); }));
    if (!gone.size) return;
    const trimmed = { ...savedItinerary, days: savedItinerary.days.map((d) => ({ ...d, items: (d.items || []).filter((it) => !(it.kind !== "event" && gone.has(it.name))) })) };
    setSavedItinerary(trimmed);
    (async () => {
      try {
        const list = [...gone];
        const ctx = { ...(savedItinerary._ctx || {}), mustInclude: [...cur] };
        const r = await fetch("/api/plan-chat", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itinerary: trimmed, history: [], context: ctx, lang,
            userMessage: `I removed ${list.join(", ")} from my saved list. Remove ${list.length > 1 ? "them" : "it"} from the plan and add ${list.length > 1 ? "replacements" : "a replacement"} that fit those days and my interests.` }) });
        const j = await r.json();
        if (j.ok && j.changed && j.itinerary?.days?.length) setSavedItinerary({ ...j.itinerary, _ctx: savedItinerary._ctx });
      } catch { /* keep the trimmed plan if backfill fails */ }
    })();
  }, [savedPlaces]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const eD = d(e.end);
      // One-time events must not have already ended. Recurring events stay under "All".
      if (!e.recurring) {
        const last = d(e.end || e.start);
        if (last && !isNaN(last) && last < TODAY) return false;
      }
      if (cats.size && !cats.has(e.cat)) return false;
      if (aud.size && !e.audience.some((a) => aud.has(a))) return false;
      // Date filters are strict: an event matches only if its concrete occurrence falls in the
      // window. The occurrence is a single day (its next date); multi-day events use their range.
      // Events we cannot place on a date never match a specific-day filter (only "All" shows them).
      if (dateF !== "all") {
        const occ = nextOccurrence(e);
        if (!occ) return false;
        const occEnd = (!isNaN(eD) && eD >= TODAY) ? eD : occ;
        if (dateF === "today" && !overlaps(occ, occEnd, TODAY, TODAY)) return false;
        if (dateF === "weekend" && !overlaps(occ, occEnd, WEEKEND_S, WEEKEND_E)) return false;
        if (dateF === "week" && !overlaps(occ, occEnd, TODAY, WEEK_E)) return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = (e.title[lang] + " " + e.venue + " " + e.blurb[lang]).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => effEventDate(a) - effEventDate(b));
  }, [events, cats, aud, dateF, query, lang]);

  // Counts mirror the strict filter: an event counts only if its concrete occurrence is in the
  // window. Undateable events are not counted for a specific day.
  const matchesWindow = (e, wS, wE) => {
    const occ = nextOccurrence(e);
    if (!occ) return false;
    const eD = d(e.end);
    const occEnd = (!isNaN(eD) && eD >= TODAY) ? eD : occ;
    return overlaps(occ, occEnd, wS, wE);
  };
  const todayCount = useMemo(() => events.filter((e) => matchesWindow(e, TODAY, TODAY)).length, [events]);
  const weekendCount = useMemo(() => events.filter((e) => matchesWindow(e, WEEKEND_S, WEEKEND_E)).length, [events]);

  const anyFilter = cats.size || aud.size || dateF !== "all" || query.trim();

  // Cuisines are OR'd (show any selected cuisine); good-for + diet are AND'd (must-have).
  const selCuisines = [...favCuisine].filter((c) => !GOODFOR.includes(c));
  const selGoodfor = [...favCuisine].filter((c) => GOODFOR.includes(c));
  // Wellness is both a type and an amenity: under "Wellness & Spas" also surface any pick
  // (a restaurant, cafe, etc.) tagged with the wellness facet, deduped by name.
  // Wellness is cross-cutting: picking it as a TYPE or as a good-for FACET surfaces every
  // wellness pick (a spa, but also a cafe or shop tagged wellness), regardless of its
  // primary list. Other good-for facets still filter within the chosen type.
  const goodforFilters = selGoodfor.filter((c) => c !== "wellness");
  let visibleLists;
  if (favType === "wellness" || favCuisine.has("wellness")) {
    const seen = new Set(); const items = [];
    favLists.flatMap((l) => l.items).forEach((it) => {
      if ((it.list_key === "wellness" || (it.cuisine || []).includes("wellness")) && !seen.has(it.name)) { seen.add(it.name); items.push(it); }
    });
    visibleLists = [{ key: "wellness", label: { en: "Wellness & Spas", es: "Bienestar y spas" }, items }];
  } else {
    visibleLists = favLists.filter((l) => !favType || l.key === favType);
  }
  const favFiltered = visibleLists
    .map((l) => ({ ...l, items: l.items.filter((it) => {
      const cz = it.cuisine || [];
      const cuisineOK = !selCuisines.length || selCuisines.some((c) => cz.includes(c));
      const goodforOK = goodforFilters.every((g) => cz.includes(g));
      const dietOK = [...favDiet].every((d) => (it.diet || []).includes(d));
      const audOK = !favAud.size || (it.audience || []).some((a) => favAud.has(a));
      const priceOK = !favPrice.size || (it.price != null && favPrice.has(Math.min(3, it.price)));
      return cuisineOK && goodforOK && dietOK && audOK && priceOK;
    }) }))
    .filter((l) => l.items.length);

  const shownCount = favFiltered.reduce((n, l) => n + l.items.length, 0);
  const favActive = favType !== "" || favCuisine.size > 0 || favDiet.size > 0 || favPrice.size > 0;

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
      if (v === "events" || v === "saved" || v === "walks" || v === "faves") { setView(v); window.history.replaceState({}, "", window.location.pathname); }
      if (params.get("planner")) { setShowPlanner(true); window.history.replaceState({}, "", window.location.pathname); }
      const place = params.get("place");
      if (place) { setView("faves"); setPendingPlaceName(place); window.history.replaceState({}, "", window.location.pathname); }
      const walkId = params.get("walk");
      if (walkId) {
        setView("walks");
        (async () => { try { const r = await fetch(`/api/walking-paths?id=${encodeURIComponent(walkId)}`); const j = await r.json(); if (j.ok) setSharedWalk(j.path); } catch {} })();
        window.history.replaceState({}, "", window.location.pathname);
      }
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
  // Open a pick linked from a best-of SEO page (/?place=Name) once the real lists have loaded.
  useEffect(() => {
    if (!pendingPlaceName) return;
    const it = favLists.flatMap((l) => l.items || []).find((x) => x.name === pendingPlaceName);
    if (it) { setPlaceDetail(it); setPendingPlaceName(null); }
  }, [pendingPlaceName, favLists]);
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
        .photo-attr, .photo-attr a { color: inherit; }
        .photo-attr a { text-decoration: none; }
        .photo-attr a:hover { text-decoration: underline; }
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
            onClick={() => { setView("faves"); setFavType(""); setFavCuisine(new Set()); setFavDiet(new Set()); setFavPrice(new Set()); setSeeAll(false); setPicksLayout("list"); setQuery(""); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); }}
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
              if (k === "guides") return <GuidesDropdown key={k} lang={lang} P={P} tabStyle={tabStyle} onWalks={() => setView("walks")} />;
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
                <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: P.marigold, margin: "0 0 8px" }}>
                  San Miguel de Allende <span style={{ color: P.inkSoft }}>· {lang === "es" ? "Recomendaciones locales" : "Local Picks"}</span>
                </p>
                <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(24px, 4vw, 34px)", margin: "0 0 8px", letterSpacing: "-.01em", lineHeight: 1.08 }}>
                  {(() => {
                    // favType can be "" (All) while a price/cuisine/diet filter is active, so fall
                    // back to a generic label instead of indexing TYPE_LABEL_PLURAL[""] (undefined).
                    const tl = (favType && TYPE_LABEL_PLURAL[favType])
                      ? TYPE_LABEL_PLURAL[favType][lang].toLowerCase()
                      : (lang === "es" ? "lugares" : "places");
                    return lang === "es" ? `Nuestros ${tl} favoritos` : `Our favorite ${tl}`;
                  })()}
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "0 0 12px" }}>
                  <p style={{ color: P.inkSoft, margin: 0, fontSize: 14.5, lineHeight: 1.5 }}>
                    {lang === "es"
                      ? `${shownCount} ${shownCount === 1 ? "lugar" : "lugares"} · Elegidos por locales, nunca patrocinados.`
                      : `${shownCount} ${shownCount === 1 ? "place" : "places"} · Chosen by locals, never sponsored.`}
                  </p>
                  <button onClick={() => setFilterSheet(true)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${P.cobalt}`, background: P.chipBg, cursor: "pointer", color: P.cobalt, fontWeight: 700, fontSize: 13, padding: "5px 13px", borderRadius: 999 }}>
                    <SlidersHorizontal size={14} /> {lang === "es" ? "Cambiar" : "Change"}
                  </button>
                  <button onClick={() => { setFavType(""); setFavCuisine(new Set()); setFavDiet(new Set()); setFavPrice(new Set()); }}
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
            {/* AI-first home: ask Vamos AI, then the decisive best-of rails. The full browse
                (featured pick + lists below) stays as the "see everything" layer. */}
            <HomeAsk lang={lang} P={P} favLists={favLists} savedPlaces={savedPlaces}
              onToggleSave={toggleSavePlace}
              onOpenPick={(name) => { const it = favLists.flatMap((l) => l.items || []).find((x) => x.name === name); if (it) setPlaceDetail(it); }}
              onOpenPlanner={(names) => { setPendingWeave(Array.isArray(names) ? names : []); setShowPlanner(true); }} />
            <BestOfRails lang={lang} P={P} savedPlaces={savedPlaces}
              onToggleSave={toggleSavePlace}
              onOpenPick={(name) => { const it = favLists.flatMap((l) => l.items || []).find((x) => x.name === name); if (it) setPlaceDetail(it); }} />
            {/* Editorial page header */}
            <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: P.marigold, margin: "0 0 8px" }}>
              San Miguel de Allende <span style={{ color: P.inkSoft }}>· {lang === "es" ? "Recomendaciones locales" : "Local Picks"}</span>
            </p>
            <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(26px, 4.2vw, 38px)", margin: "0 0 8px", letterSpacing: "-.01em", lineHeight: 1.06 }}>
              {lang === "es" ? "Los lugares a los que mandamos a nuestros amigos." : "The places we send our friends to."}
            </h1>
            <p style={{ color: P.inkSoft, margin: "0 0 22px", fontSize: 15.5, lineHeight: 1.5, maxWidth: "58ch" }}>
              {lang === "es"
                ? "Elegidos por locales, nunca patrocinados. Cada lugar aquí es uno al que te llevaríamos nosotros mismos, en el Centro y los alrededores."
                : "Chosen by locals, never sponsored. Every spot here is one we'd walk you to ourselves, in Centro and the surrounding countryside."}
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
                    <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: P.coral, fontWeight: 800 }}>
                      {lang === "es" ? "Recomendación de la semana" : "This week's featured pick"}
                    </span>
                    {f[lang] && <p style={{ margin: "10px 0 16px", color: P.inkSoft, fontSize: 14.5, lineHeight: 1.5 }}>{f[lang]}</p>}
                    <button onClick={() => toggleSavePlace(f.name)}
                      style={{ alignSelf: "flex-start", border: "none", cursor: "pointer", background: P.cobalt, color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 18px", borderRadius: 11, display: "flex", alignItems: "center", gap: 7 }}>
                      <Heart size={16} fill={isSaved ? "#fff" : "none"} /> {isSaved ? (lang === "es" ? "Guardado" : "Saved") : (lang === "es" ? "Guardar" : "Save")}
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 15, fontSize: 12.5, color: "#2F7A63", fontWeight: 700 }}>
                      <Check size={15} /> {lang === "es" ? "Elegidos por locales, nunca patrocinados" : "Chosen by locals, never sponsored"}
                    </div>
                  </div>
                </div>
              );
            })()}
            </>
            )}

            {!(favActive || seeAll || query.trim()) ? (
              /* After the featured pick: choose a category (drills into the filtered browse) or
                 open the full catalog. No side rail on the clean home. */
              (() => {
                const total = favLists.reduce((n, l) => n + (l.items ? l.items.length : 0), 0);
                return (
                <section style={{ margin: "6px 0 10px" }}>
                  <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(21px, 3vw, 27px)", textAlign: "center", margin: "0 0 4px", color: P.ink }}>{lang === "es" ? "¿Qué se te antoja?" : "What are you looking for?"}</h2>
                  <p style={{ textAlign: "center", fontSize: 14, color: P.inkSoft, margin: "0 0 18px" }}>{lang === "es" ? "Elige una categoría, o explora todo." : "Pick a category, or browse everything."}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 640, margin: "0 auto" }}>
                    {TYPE_ORDER.map((k) => { const Ic = PLACE_TYPE[k].Icon; return (
                      <button key={k} onClick={() => setFavType(k)} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${P.line}`, background: P.card, cursor: "pointer", color: P.ink, fontWeight: 700, fontSize: 15, padding: "11px 18px", borderRadius: 999 }}>
                        <Ic size={17} /> {TYPE_LABEL_PLURAL[k][lang]}
                      </button>
                    ); })}
                    <button onClick={() => setView("walks")} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: `1px solid ${P.coral}`, background: P.chipBg, cursor: "pointer", color: P.coral, fontWeight: 700, fontSize: 15, padding: "11px 18px", borderRadius: 999 }}>🚶 {lang === "es" ? "Caminatas" : "Walking paths"}</button>
                  </div>
                  <div style={{ textAlign: "center", marginTop: 22 }}>
                    <button onClick={() => setSeeAll(true)} style={{ border: "none", background: P.cobalt, color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 14.5, padding: "12px 24px", borderRadius: 12 }}>
                      {lang === "es" ? `Ver los ${total} lugares` : `See all ${total} hand-picked places`} →
                    </button>
                  </div>
                </section>
                );
              })()
            ) : (
            <div className="picks-layout">
              <div className="filters-inline filter-rail">
                <FilterGroups favType={favType} setFavType={setFavType} favCuisine={favCuisine}
                  setFavCuisine={setFavCuisine} favDiet={favDiet} setFavDiet={setFavDiet} favPrice={favPrice} setFavPrice={setFavPrice} lang={lang} t={t} P={P} onWalks={() => setView("walks")} />
              </div>
              <div className="picks-main">
            <>
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
                <p className="disp" style={{ fontSize: 16, fontWeight: 700, color: P.ink, margin: "0 0 6px" }}>{t.placesNone}</p>
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
            </>
              </div>
            </div>
            )}
          </>
        ) : view === "move" ? (
          <div>
            <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: P.marigold, margin: "0 0 8px" }}>
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
        ) : view === "walks" ? (
          <WalksView lang={lang} P={P} savedWalks={savedWalks} onToggleSave={toggleSaveWalk} onShare={shareWalk} shareMsg={walkShareMsg}
            onCreate={() => setShowWalkBuilder(true)} sharedWalk={sharedWalk} onPlan={planAroundWalk} />
        ) : (
          /* ---- Saved (device-based personal collection) ---- */
          <>
          {/* Recommended itinerary always lives at the top of Saved. Show the plan when
              one exists; otherwise invite building one from the saved spots below. */}
          {savedItinerary ? (
            <SavedItinerary itin={savedItinerary} setItin={setSavedItinerary} lang={lang} t={t} P={P} savedNames={[...savedPlaces]}
              weaveIn={pendingWeave} onWove={() => setPendingWeave([])}
              photoFor={(name) => { const it = favLists.flatMap((l) => l.items || []).find((x) => x.name === name); return it ? (it.photo_url || (Array.isArray(it.photos) && it.photos[0]) || null) : null; }}
              onOpenPick={(name) => { const it = favLists.flatMap((l) => l.items || []).find((x) => x.name === name); if (it) setPlaceDetail(it); }}
              onOpenEvent={(name) => { const e = events.find((x) => x.title?.en === name || x.title?.[lang] === name); if (e) setDetail(e); }} />
          ) : (savedPlaceItems.length > 0 || savedEvents.length > 0) ? (
            <div style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 16, padding: "20px 22px", marginBottom: 26,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 220, flex: 1 }}>
                <div className="disp" style={{ fontSize: 13, fontWeight: 700, color: P.inkSoft, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
                  {lang === "es" ? "Itinerario recomendado" : "Recommended itinerary"}
                </div>
                <p style={{ margin: 0, fontSize: 14.5, color: P.ink, lineHeight: 1.5 }}>
                  {lang === "es"
                    ? `Deja que Vamos AI organice tus ${savedPlaceItems.length} lugares guardados en un plan día por día.`
                    : `Let Vamos AI arrange your ${savedPlaceItems.length} saved spot${savedPlaceItems.length === 1 ? "" : "s"} into a day-by-day plan.`}
                </p>
              </div>
              <button onClick={() => setShowPlanner(true)}
                style={{ border: "none", background: P.coral, color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 15, padding: "12px 22px", borderRadius: 12, whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(224,106,99,.28)" }}>
                ✨ {lang === "es" ? "Armar mi itinerario" : "Build my itinerary"}
              </button>
            </div>
          ) : null}
          {savedWalks.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 className="disp" style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px", color: P.inkSoft, textTransform: "uppercase", letterSpacing: ".04em" }}>{lang === "es" ? "Caminatas guardadas" : "Saved walks"}</h2>
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {savedWalks.map((p) => <WalkCard key={p.id} path={p} lang={lang} P={P} saved onToggleSave={() => toggleSaveWalk(p)} onShare={() => shareWalk(p)} onPlan={() => planAroundWalk(p)} shareMsg={walkShareMsg[p.id]} />)}
              </div>
            </section>
          )}
          {savedEvents.length === 0 && savedPlaceItems.length === 0 && savedWalks.length === 0 ? (savedItinerary ? null : (
            <div style={{ textAlign: "center", padding: "48px 24px", color: P.inkSoft }}>
              <Heart size={30} color={P.rosa} style={{ opacity: .6 }} />
              <p className="disp" style={{ fontSize: 17, fontWeight: 700, color: P.ink, margin: "12px 0 6px" }}>{t.savedEmpty}</p>
              <p style={{ margin: "0 0 18px", fontSize: 14, maxWidth: 320, marginInline: "auto", lineHeight: 1.5 }}>{t.savedHint}</p>
              <button onClick={() => setShowPlanner(true)}
                style={{ border: "none", background: P.coral, color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 15, padding: "12px 22px", borderRadius: 12, boxShadow: "0 4px 14px rgba(224,106,99,.28)" }}>
                ✨ {lang === "es" ? "Deja que Vamos AI arme tu viaje" : "Let Vamos AI plan your trip"}
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
                  ✨ {lang === "es" ? "Armar con Vamos AI" : "Plan with Vamos AI"}
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

      {/* Mobile bottom tab bar — Plan + Move Here collapse into one Guides tab (matches desktop). */}
      <nav className="viewnav-bottom" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 900,
        background: P.card, borderTop: `1px solid ${P.line}`, boxShadow: "0 -2px 14px rgba(13,20,40,.09)",
        justifyContent: "space-around", padding: "8px 0 calc(8px + env(safe-area-inset-bottom))" }}>
        {[["faves", t.faves, MapPin], ["events", t.events, Clock]].map(([k, label, Ic]) => {
          const tabStyle = { border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: view === k ? P.coral : P.inkSoft, fontSize: 10, fontWeight: 700, position: "relative", minWidth: 46, textDecoration: "none" };
          return (
            <button key={k} onClick={() => setView(k)} aria-pressed={view === k} style={tabStyle}>
              <Ic size={21} /> {label}
            </button>
          );
        })}
        <MobileGuidesTab active={view === "walks"} onWalks={() => setView("walks")} lang={lang} />
        <button onClick={() => setView("saved")} aria-pressed={view === "saved"}
          style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: view === "saved" ? P.coral : P.inkSoft, fontSize: 10, fontWeight: 700, position: "relative", minWidth: 46 }}>
          <Heart size={21} fill={view === "saved" ? P.coral : "none"} />
          {t.savedTab}
          {(saved.size + savedPlaces.size) > 0 &&
            <span style={{ position: "absolute", top: -3, right: 14, fontSize: 10, fontWeight: 700, color: "#fff", background: P.coral, borderRadius: 999, padding: "0 5px" }}>{saved.size + savedPlaces.size}</span>}
        </button>
        <button onClick={() => setShowPlanner(true)}
          style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: P.inkSoft, fontSize: 10, fontWeight: 700, minWidth: 46 }}>
          <Sparkles size={21} /> {lang === "es" ? "Viaje" : "Plan Trip"}
        </button>
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
            style={{ background: P.sheet, color: P.ink, width: "100%", maxWidth: 560, maxHeight: "min(88vh, 88dvh)", overflowY: "auto", borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,.28)" }}>
            <div style={{ position: "sticky", top: 0, background: P.sheet, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px", borderBottom: `1px solid ${P.line}`, zIndex: 3 }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, margin: 0 }}>{lang === "es" ? "Filtros" : "Filters"}</h2>
              <button onClick={() => setFilterSheet(false)} aria-label={t.back} style={{ border: "none", background: "transparent", cursor: "pointer", color: P.inkSoft, display: "grid", placeItems: "center" }}><X size={22} /></button>
            </div>
            <div style={{ padding: "16px 18px 12px" }}>
              <FilterGroups favType={favType} setFavType={setFavType} favCuisine={favCuisine}
                setFavCuisine={setFavCuisine} favDiet={favDiet} setFavDiet={setFavDiet} favPrice={favPrice} setFavPrice={setFavPrice} lang={lang} t={t} P={P} onWalks={() => setView("walks")} />
            </div>
            <div style={{ position: "sticky", bottom: 0, background: P.sheet, display: "flex", gap: 10, padding: "12px 18px calc(14px + env(safe-area-inset-bottom))", borderTop: `1px solid ${P.line}` }}>
              <button onClick={() => { setFavType(""); setFavCuisine(new Set()); setFavDiet(new Set()); setFavPrice(new Set()); }}
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

      {showWalkBuilder && (
        <WalkBuilder lang={lang} P={P} onClose={() => setShowWalkBuilder(false)}
          onSaved={(path) => { setSavedWalks((w) => [path, ...w]); setShowWalkBuilder(false); setSharedWalk(path); setView("walks"); }} />
      )}
      {showPlanner && (
        <TripPlanner
          onClose={() => { setShowPlanner(false); setPlannerWalk(null); setPendingWeave([]); }}
          existingItinerary={savedItinerary}
          walk={plannerWalk}
          onRefine={() => { setShowPlanner(false); setView("saved"); }}
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
            setPendingWeave([]); // a fresh plan already includes the saved spots
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
  const sD = d(e.start), eD = d(e.end);
  const occ = nextOccurrence(e); // concrete upcoming date (rolled or computed from weekdays), or null
  // A multi-day event that has already started but not ended is happening NOW; showing its
  // past start date makes it look stale, so the rail shows "Now" instead.
  const inProgress = !e.recurring && e.start !== e.end && sD <= TODAY && eD >= TODAY;

  return (
    <article className="card" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onOpen(); } }}
      style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 16, overflow: "hidden", display: "flex", cursor: "pointer" }}>
      {/* Date rail — recurring events show a repeat mark + representative weekday instead of a
          stale specific date; one-off events show the day + month. */}
      <div style={{ background: cat.c, color: "#fff", width: 62, flexShrink: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "10px 4px", gap: 4 }}>
        {e.recurring && occ ? (
          <>
            {/* Recurring with a concrete next occurrence (rolled or computed): show that date. */}
            <Repeat size={13} style={{ opacity: .9 }} />
            <span className="disp" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{occ.getDate()}</span>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>{MONTHS[lang][occ.getMonth()]}</span>
          </>
        ) : e.recurring ? (
          <>
            {/* Recurring but not datable: show the schedule note if we have one, else just the mark. */}
            <Repeat size={18} style={{ opacity: .95 }} />
            {recurKnown(e) && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".01em", lineHeight: 1.18, textAlign: "center" }}>{recurWhen(e, lang, t)}</span>}
          </>
        ) : inProgress ? (
          <>
            <Ic size={16} style={{ opacity: .9 }} />
            <span style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", lineHeight: 1.1, textAlign: "center" }}>{lang === "es" ? "Ahora" : "Now"}</span>
          </>
        ) : (
          <>
            <Ic size={16} style={{ opacity: .9 }} />
            <span className="disp" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{sD.getDate()}</span>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>{MONTHS[lang][sD.getMonth()]}</span>
          </>
        )}
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
function FilterGroups({ favType, setFavType, favCuisine, setFavCuisine, favDiet, setFavDiet, favPrice, setFavPrice, lang, t, P, onWalks }) {
  const flip = (setter, set, k) => setter(() => { const s = new Set(set); s.has(k) ? s.delete(k) : s.add(k); return s; });
  const clearType = (k) => { setFavType(k); if (k !== "rest") { setFavCuisine(new Set()); setFavDiet(new Set()); } };
  const Label = ({ children }) => (
    <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: P.inkSoft, margin: "0 0 8px" }}>{children}</div>
  );
  // appearance:none stops iOS Safari from painting its native (grey) button chrome over a
  // selected chip's custom background, so an "on" chip reads as filled, not deselected.
  const base = { cursor: "pointer", borderRadius: 999, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, WebkitAppearance: "none", appearance: "none" };
  const cuisines = Object.keys(CUISINES).filter((k) => !GOODFOR.includes(k)).sort((a, b) => CUISINES[a][lang].localeCompare(CUISINES[b][lang]));
  const active = favType !== "" || favCuisine.size > 0 || favDiet.size > 0 || (favPrice && favPrice.size > 0);
  const clearAll = () => { setFavType(""); setFavCuisine(new Set()); setFavDiet(new Set()); setFavPrice && setFavPrice(new Set()); };
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
          {onWalks && (
            <button onClick={onWalks}
              style={{ ...base, padding: "7px 15px", fontSize: 14, fontWeight: 700, border: `1px solid ${P.coral}`, background: P.chipBg, color: P.coral }}>
              🚶 {lang === "es" ? "Caminatas" : "Walking paths"}
            </button>
          )}
        </div>
      </div>

      {(favType === "" || favType === "rest" || favType === "bar") && setFavPrice && (
        <div>
          <Label>{lang === "es" ? "Precio" : "Price"}</Label>
          <div className="catrow">
            {[1, 2, 3].map((tier) => {
              const on = favPrice.has(tier);
              return (
                <button key={tier} onClick={() => flip(setFavPrice, favPrice, tier)} title={`${tier} ${lang === "es" ? "de" : "of"} 3`}
                  style={{ ...base, padding: "6px 15px", fontSize: 15, fontWeight: 800, letterSpacing: "-.5px", border: `1px solid ${on ? GREEN : P.line}`, background: on ? GREEN : P.chipBg, color: on ? "#fff" : P.inkSoft }}>
                  {"$".repeat(tier)}
                </button>
              );
            })}
          </div>
        </div>
      )}

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

// Price as a pill of 3 dollar signs, so it's clear it's out of 3: filled green up to the
// tier, grey for the rest (so $$ reads as 2 of 3). Google's 0-4 level caps to a 1-3 scale.
function priceDots(price, P, big) {
  if (price == null || price < 1) return null;
  const tier = Math.min(3, price);
  return (
    <span title={`${tier} of 3`} aria-label={`Price, ${tier} of 3`}
      style={{ display: "inline-flex", alignItems: "center", gap: 1, flexShrink: 0, border: `1px solid ${P.line}`, background: P.chipBg, borderRadius: 999, padding: big ? "3px 10px" : "2px 8px", fontWeight: 800, fontSize: big ? 15 : 13 }}>
      {[1, 2, 3].map((i) => <span key={i} style={{ color: i <= tier ? "#2F7A63" : "#C7BCA6" }}>$</span>)}
    </span>
  );
}
const hasPrice = (it) => (it.list_key === "rest" || it.list_key === "bar") && it.price != null && it.price >= 1;

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: cat.c, textTransform: "uppercase", letterSpacing: ".05em" }}>{typeLabel}</span>
          {hasPrice(it) && priceDots(it.price, P)}
        </div>
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
  // Prefer the photos[] array (each carries its Google attribution); fall back to the single
  // hero image for older records. Each gallery item is { url, attr } so we can show the
  // required per-photo attribution as the visitor swipes.
  const galleryUrls = (it.photos && it.photos.length) ? it.photos : (it.img ? [it.img] : []);
  const gallery = galleryUrls.filter(Boolean).map((url, i) => ({ url, attr: (it.photo_attributions || [])[i] || "" }));
  const [idx, setIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const curItem = gallery[Math.min(idx, gallery.length - 1)] || null;
  const cur = curItem ? curItem.url : undefined;
  const curAttr = curItem ? curItem.attr : "";

  useEffect(() => {
    const onKey = (ev) => { if (ev.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Share a deep link that opens this exact pick in the app.
  const sharePlace = async () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/?place=${encodeURIComponent(it.name)}`;
    if (typeof navigator !== "undefined" && navigator.share) { try { await navigator.share({ title: it.name, text: it.name, url }); } catch { /* dismissed */ } }
    else if (typeof navigator !== "undefined" && navigator.clipboard) {
      try { await navigator.clipboard.writeText(`${it.name} - ${url}`); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
    }
  };

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
        style={{ background: P.sheet, color: P.ink, width: "100%", maxWidth: 560, maxHeight: "min(92vh, 92dvh)", overflowY: "auto", borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,.28)" }}>
        {/* Hero gallery */}
        <div style={{ position: "relative" }}>
          <Media img={cur} cat={it.cat} iconSize={56} style={{ width: "100%", height: 220 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,.4), rgba(0,0,0,0) 40%)" }} />
          {/* Offset by the safe-area inset so the close button clears the notch / browser bar. */}
          <button onClick={onClose} aria-label={t.back}
            style={{ position: "absolute", top: "calc(12px + env(safe-area-inset-top))", right: 12, width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center", boxShadow: "0 1px 6px rgba(0,0,0,.25)", zIndex: 2 }}>
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
          {/* Google requires each photo's attribution be shown; kept small and subtle. */}
          {curAttr && (
            <div className="photo-attr"
              style={{ position: "absolute", right: 11, bottom: 7, maxWidth: "66%", fontSize: 9.5, lineHeight: 1.25, textAlign: "right", color: "rgba(255,255,255,.8)", textShadow: "0 1px 3px rgba(0,0,0,.9)", zIndex: 2 }}
              dangerouslySetInnerHTML={{ __html: curAttr }} />
          )}
        </div>

        <div style={{ padding: "16px 18px 22px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: P.coral, textTransform: "uppercase", letterSpacing: ".05em" }}>{ty[lang]}</span>
                {hasPrice(it) && priceDots(it.price, P)}
              </span>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 24, margin: "3px 0 4px", lineHeight: 1.12 }}>{it.name}</h2>
              <p style={{ margin: 0, fontSize: 13.5, color: P.inkSoft, display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} /> {areaLabel(it, lang)}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, alignItems: "stretch" }}>
              <button onClick={onSave} aria-pressed={saved}
                style={{ border: `1px solid ${saved ? P.coral : P.line}`, cursor: "pointer", background: saved ? P.coral : P.chipBg, color: saved ? "#fff" : P.ink, fontWeight: 700, fontSize: 13.5, padding: "9px 14px", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Heart size={15} fill={saved ? "#fff" : "none"} /> {saved ? (es ? "Guardado" : "Saved") : (es ? "Guardar" : "Save")}
              </button>
              <button onClick={sharePlace}
                style={{ border: `1px solid ${P.line}`, cursor: "pointer", background: P.chipBg, color: P.ink, fontWeight: 700, fontSize: 13.5, padding: "9px 14px", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {copied ? <Check size={15} /> : <Share2 size={15} />} {copied ? t.copied : t.share}
              </button>
            </div>
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
              // Prefer the structured weekday_text; otherwise split the stored hours string
              // (newline-joined) into one line per day so it never renders as a run-on blob.
              // Normalize en/em dashes to a plain hyphen to match our house style.
              const cleanDash = (s) => String(s).replace(/\s*[–—]\s*/g, " - ");
              const week = (it.hoursJson && it.hoursJson.weekday_text)
                || (it.hours ? String(it.hours).split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : null);
              if (!st && !(week && week.length)) return null;
              return (
                <details style={{ marginBottom: 4 }}>
                  <summary style={{ display: "flex", alignItems: "center", gap: 9, cursor: (week && week.length) ? "pointer" : "default", listStyle: "none", fontSize: 14, color: P.inkSoft, padding: "5px 0" }}>
                    <Clock3 size={15} style={{ flexShrink: 0, color: P.inkSoft }} />
                    {st && <span style={{ fontWeight: 700, color: st.open ? "#2F7A63" : "#C0554E" }}>{st.text}</span>}
                    {st && week && week.length > 0 && <span style={{ color: "#B9AE9C" }}>·</span>}
                    {(!st || (week && week.length)) && <span>{es ? "Ver horario" : "See hours"}</span>}
                  </summary>
                  {week && week.length > 0 && (
                    <div style={{ padding: "6px 0 4px 24px", display: "grid", gap: 2 }}>
                      {week.map((line, i) => <span key={i} style={{ fontSize: 13, color: P.inkSoft }}>{cleanDash(line)}</span>)}
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
        style={{ background: P.sheet, color: P.ink, width: "100%", maxWidth: 560, maxHeight: "min(92vh, 92dvh)", overflowY: "auto",
          borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,.28)" }}>
        {/* Hero image with overlaid category chip + close */}
        <div style={{ position: "relative" }}>
          <Media img={e.img} cat={e.cat} iconSize={56} style={{ width: "100%", height: 190 }} />
          <div style={{ position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,.45), rgba(0,0,0,0) 42%)" }} />
          {/* Top padding includes the safe-area inset so the close button clears the browser bar. */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "calc(14px + env(safe-area-inset-top)) 16px 14px",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, zIndex: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#fff",
              background: cat.c, padding: "5px 11px", borderRadius: 999, boxShadow: "0 2px 8px rgba(0,0,0,.25)" }}>
              <Ic size={15} />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{cat[lang]}</span>
              {e.recurring && <span style={{ fontSize: 11, opacity: .95, display: "flex", alignItems: "center", gap: 3 }}>
                <Repeat size={12} /> {recurWhen(e, lang, t)}</span>}
            </div>
            <button onClick={onClose} aria-label={t.back}
              style={{ border: "none", background: "rgba(0,0,0,.5)", color: "#fff", cursor: "pointer",
                width: 32, height: 32, borderRadius: 999, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <X size={18} />
            </button>
          </div>
          {/* Google photo attribution for the venue image, kept small and subtle. */}
          {e.imgAttr && (
            <div className="photo-attr"
              style={{ position: "absolute", right: 11, bottom: 7, maxWidth: "66%", fontSize: 9.5, lineHeight: 1.25, textAlign: "right", color: "rgba(255,255,255,.8)", textShadow: "0 1px 3px rgba(0,0,0,.9)", zIndex: 2 }}
              dangerouslySetInnerHTML={{ __html: e.imgAttr }} />
          )}
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
