"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  Heart, Search, MapPin, Clock, Ticket, Globe, Repeat, X,
  Music, Clapperboard, Footprints, Users, MessagesSquare, ShoppingBasket, Waves,
  Map as MapIcon, List as ListIcon, CalendarPlus, Share2, ExternalLink,
  Moon, Sun, Check, Baby, Backpack, Sprout, Salad,
  Utensils, Wine, Palette,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchEvents, fetchPlaces } from "../lib/supabase";

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
    events: "Eventos", faves: "Recomendados", savedTab: "Guardados", search: "Buscar eventos, lugares…",
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
    events: "Events", faves: "Local Picks", savedTab: "Saved", search: "Search events, places…",
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

const catIcon = (color) =>
  L.divIcon({
    className: "qp-pin",
    html: `<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);background:${color};border:2.5px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>`,
    iconSize: [22, 22], iconAnchor: [11, 22], popupAnchor: [0, -20],
  });

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
  const [theme, setTheme] = useState(() =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const [view, setView] = useState("events");
  const [eventLayout, setEventLayout] = useState("list"); // list | map
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState(new Set());
  const [aud, setAud] = useState(new Set());
  const [favCats, setFavCats] = useState(new Set());
  const [favAud, setFavAud] = useState(new Set());
  const [favDiet, setFavDiet] = useState(new Set());
  const [dateF, setDateF] = useState("all");
  const [saved, setSaved] = useState(() => loadSet("qp_saved_events"));
  const [savedPlaces, setSavedPlaces] = useState(() => loadSet("qp_saved_places"));
  const [detail, setDetail] = useState(null); // event object or null
  const [events, setEvents] = useState(SEED_EVENTS);
  const [favLists, setFavLists] = useState(SEED_FAV_LISTS);
  const t = T[lang];
  const P = PALETTES[theme];

  useEffect(() => { localStorage.setItem("qp_saved_events", JSON.stringify([...saved])); }, [saved]);
  useEffect(() => { localStorage.setItem("qp_saved_places", JSON.stringify([...savedPlaces])); }, [savedPlaces]);

  // Load live data from Supabase; keep the seed as offline fallback.
  useEffect(() => {
    fetchEvents().then((d) => { if (d && d.length) setEvents(d); });
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

  const favFiltered = favLists
    .filter((l) => !favCats.size || favCats.has(l.cat))
    .map((l) => ({ ...l, items: l.items.filter((it) =>
      (!favAud.size || it.audience.some((a) => favAud.has(a))) &&
      (!favDiet.size || (it.diet || []).some((x) => favDiet.has(x)))
    ) }))
    .filter((l) => l.items.length);

  const savedEvents = useMemo(
    () => events.filter((e) => saved.has(e.id)).sort((a, b) => d(a.start) - d(b.start)), [saved, events]);
  const savedPlaceItems = useMemo(() => {
    const out = [];
    favLists.forEach((l) => l.items.forEach((it) => { if (savedPlaces.has(it.name)) out.push(it); }));
    return out;
  }, [savedPlaces, favLists]);
  const toggleSavePlace = (name) => toggle(setSavedPlaces, savedPlaces, name);

  return (
    <div style={{ background: P.plaster, color: P.ink, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", transition: "background .2s ease, color .2s ease" }}>
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
        .hero-split { display: grid; grid-template-columns: 1fr; }
        @media (min-width: 600px) { .hero-split { grid-template-columns: 1.25fr 1fr; } }
        .viewnav-top { display: none; }
        @media (min-width: 680px) { .viewnav-top { display: flex; } }
        .viewnav-bottom { display: none; }
        @media (max-width: 679px) { .viewnav-bottom { display: flex; } main { padding-bottom: 82px !important; } }
        button:focus-visible, [tabindex]:focus-visible { outline: 3px solid ${P.marigold}; outline-offset: 2px; border-radius: 10px; }
        .leaflet-container { font-family: inherit; border-radius: 16px; }
        @keyframes qpUp { from { transform: translateY(14px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .sheet { animation: qpUp .18s ease; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
      `}</style>

      {/* Header */}
      <header style={{
        backgroundColor: "#0D1B36", color: "#F7F3EC",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.13'%3E%3Cpath d='M20 0 L40 20 L20 40 L0 20 Z'/%3E%3Ccircle cx='20' cy='20' r='2.6' fill='%23F2A100' fill-opacity='0.5' stroke='none'/%3E%3C/g%3E%3C/svg%3E")`,
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "18px 18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <img src="/logo-dark.svg" alt="Vamos San Miguel — Events · Local Picks · Insider Guide" className="brandlogo" />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setTheme((v) => (v === "dark" ? "light" : "dark"))}
                aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
                style={{ border: "none", cursor: "pointer", width: 34, height: 34, borderRadius: 999,
                  display: "grid", placeItems: "center", background: "rgba(255,255,255,.15)", color: "#fff" }}>
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <div role="group" aria-label="Language" style={{ display: "flex", background: "rgba(255,255,255,.15)", borderRadius: 999, padding: 3 }}>
                {["es", "en"].map((l) => (
                  <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                    style={{ border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                      background: lang === l ? "#F7F3EC" : "transparent", color: lang === l ? "#0D1B36" : "#F7F3EC" }}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <nav className="viewnav-top" style={{ marginTop: 12, gap: 26, alignItems: "center" }}>
            {[["events", t.events], ["faves", t.faves], ["saved", t.savedTab]].map(([k, label]) => (
              <button key={k} onClick={() => setView(k)}
                style={{ border: "none", cursor: "pointer", background: "transparent", fontSize: 15, fontWeight: 700, padding: "5px 0",
                  color: view === k ? "#fff" : "rgba(255,255,255,.62)", borderBottom: view === k ? "3px solid #E06A63" : "3px solid transparent",
                  display: "flex", alignItems: "center", gap: 6 }}>
                {label}
                {k === "saved" && (saved.size + savedPlaces.size) > 0 &&
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#E06A63", borderRadius: 999, padding: "1px 7px" }}>{saved.size + savedPlaces.size}</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "16px 18px 60px" }}>
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
              <div style={{ display: "grid", gap: 12 }}>
                {filtered.map((e) => (
                  <EventCard key={e.id} e={e} lang={lang} t={t} P={P} saved={saved.has(e.id)}
                    onSave={() => toggle(setSaved, saved, e.id)} onOpen={() => setDetail(e)} />
                ))}
              </div>
            )}
          </>
        ) : view === "faves" ? (
          <>
            {/* Editorial page header */}
            <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: P.marigold, margin: "0 0 7px" }}>
              {lang === "es" ? "Recomendaciones locales" : "Local Picks"}
            </p>
            <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(26px, 4.2vw, 38px)", margin: "0 0 8px", letterSpacing: "-.01em", lineHeight: 1.06 }}>
              {lang === "es" ? "Los lugares a los que mandamos a nuestros amigos." : "The places we send our friends to."}
            </h1>
            <p style={{ color: P.inkSoft, margin: "0 0 22px", fontSize: 15.5, lineHeight: 1.5, maxWidth: "58ch" }}>
              {lang === "es"
                ? "Elegidos a mano, nunca pagados. Cada lugar aquí es uno al que te llevaríamos nosotros mismos, en el Centro y los alrededores."
                : "Hand-picked, never paid for. Every spot here is one we'd walk you to ourselves, in Centro and the surrounding countryside."}
            </p>

            {/* Featured pick of the week */}
            {(() => {
              const f = favLists.flatMap((l) => l.items || []).find((x) => x.img) || favLists.flatMap((l) => l.items || [])[0];
              if (!f) return null;
              const fc = CATS[f.cat] || { c: P.coral, es: "", en: "" };
              const isSaved = savedPlaces.has(f.name);
              return (
                <div className="card hero-split" style={{ borderRadius: 20, overflow: "hidden", border: `1px solid ${P.line}`, marginBottom: 26 }}>
                  <div style={{ position: "relative", minHeight: 230 }}>
                    <Media img={f.img} cat={f.cat} iconSize={44} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,20,40,.74), transparent 55%)" }} />
                    <div style={{ position: "absolute", left: 18, right: 18, bottom: 16, color: "#fff" }}>
                      <span style={{ background: "rgba(255,255,255,.94)", color: P.cobalt, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", padding: "4px 11px", borderRadius: 999 }}>{fc[lang]}</span>
                      <h3 style={{ fontFamily: "Georgia, serif", fontSize: 25, margin: "10px 0 3px", textShadow: "0 2px 16px rgba(0,0,0,.45)" }}>{f.name}</h3>
                      <p style={{ margin: 0, fontSize: 13.5, opacity: .9 }}>{f.area}</p>
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

            {/* Favorites audience + category filters */}
            <div className="catrow" style={{ marginBottom: 18 }}>
              {Object.entries(AUDIENCES).map(([k, a]) => {
                const on = favAud.has(k);
                const Ic = a.Icon;
                return (
                  <button key={k} onClick={() => toggle(setFavAud, favAud, k)} className="chip"
                    style={{ cursor: "pointer", padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                      display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                      border: `1px solid ${on ? P.cobalt : P.line}`, background: on ? P.cobalt : P.chipBg, color: on ? "#fff" : P.inkSoft }}>
                    <Ic size={13} /> {a[lang]}
                  </button>
                );
              })}
              {Object.entries(DIET).map(([k, dt]) => {
                const on = favDiet.has(k);
                const Ic = dt.Icon;
                return (
                  <button key={k} onClick={() => toggle(setFavDiet, favDiet, k)} className="chip"
                    style={{ cursor: "pointer", padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                      display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                      border: `1px solid ${on ? "#2F7A63" : P.line}`, background: on ? "#2F7A63" : P.chipBg, color: on ? "#fff" : P.inkSoft }}>
                    <Ic size={13} /> {dt[lang]}
                  </button>
                );
              })}
              <span style={{ width: 1, alignSelf: "stretch", background: P.line, margin: "3px 4px", flexShrink: 0 }} />
              <button onClick={() => setFavCats(new Set())} className="chip"
                style={{ cursor: "pointer", padding: "5px 13px", borderRadius: 999, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
                  border: `1px solid ${favCats.size === 0 ? P.cobalt : P.line}`,
                  background: favCats.size === 0 ? P.cobalt : P.chipBg, color: favCats.size === 0 ? "#fff" : P.inkSoft }}>
                {t.all}
              </button>
              {Object.entries(CATS).map(([k, c]) => {
                const on = favCats.has(k);
                const Ic = c.Icon;
                return (
                  <button key={k} onClick={() => toggle(setFavCats, favCats, k)} className="chip"
                    style={{ cursor: "pointer", padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                      display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                      border: `1px solid ${on ? c.c : P.line}`, background: on ? c.c : P.chipBg, color: on ? "#fff" : P.inkSoft }}>
                    <Ic size={13} /> {c[lang]}
                  </button>
                );
              })}
            </div>

            {favFiltered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: P.inkSoft }}>
                <p className="disp" style={{ fontSize: 16, fontWeight: 700, color: P.ink, margin: "0 0 6px" }}>{t.none}</p>
                <p style={{ margin: 0, fontSize: 14 }}>{t.noneHint}</p>
              </div>
            ) : favFiltered.map((list) => (
              <section key={list.key} style={{ marginBottom: 22 }}>
                <h2 className="disp" style={{ fontSize: 17, fontWeight: 700, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: CATS[list.cat].c }} />
                  {list[lang]}
                </h2>
                <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                  {list.items.map((it) => (
                    <PlaceCard key={it.name} it={it} lang={lang} t={t} P={P}
                      saved={savedPlaces.has(it.name)} onSave={() => toggleSavePlace(it.name)} />
                  ))}
                </div>
              </section>
            ))}
          </>
        ) : (
          /* ---- Saved (device-based personal collection) ---- */
          savedEvents.length === 0 && savedPlaceItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "56px 24px", color: P.inkSoft }}>
              <Heart size={30} color={P.rosa} style={{ opacity: .6 }} />
              <p className="disp" style={{ fontSize: 17, fontWeight: 700, color: P.ink, margin: "12px 0 6px" }}>{t.savedEmpty}</p>
              <p style={{ margin: 0, fontSize: 14, maxWidth: 300, marginInline: "auto", lineHeight: 1.5 }}>{t.savedHint}</p>
            </div>
          ) : (
            <>
              {savedEvents.length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <h2 className="disp" style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px", color: P.inkSoft, textTransform: "uppercase", letterSpacing: ".04em" }}>{t.savedEvents}</h2>
                  <div style={{ display: "grid", gap: 12 }}>
                    {savedEvents.map((e) => (
                      <EventCard key={e.id} e={e} lang={lang} t={t} P={P} saved={saved.has(e.id)}
                        onSave={() => toggle(setSaved, saved, e.id)} onOpen={() => setDetail(e)} />
                    ))}
                  </div>
                </section>
              )}
              {savedPlaceItems.length > 0 && (
                <section style={{ marginBottom: 8 }}>
                  <h2 className="disp" style={{ fontWeight: 700, margin: "0 0 10px", color: P.inkSoft, textTransform: "uppercase", letterSpacing: ".04em", fontSize: 13 }}>{t.savedPlaces}</h2>
                  <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                    {savedPlaceItems.map((it) => (
                      <PlaceCard key={it.name} it={it} lang={lang} t={t} P={P}
                        saved={savedPlaces.has(it.name)} onSave={() => toggleSavePlace(it.name)} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )
        )}

        <p style={{ textAlign: "center", fontSize: 12, color: P.inkSoft, marginTop: 34, lineHeight: 1.6 }}>{t.footer}</p>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="viewnav-bottom" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 900,
        background: P.card, borderTop: `1px solid ${P.line}`, boxShadow: "0 -2px 14px rgba(13,20,40,.09)",
        justifyContent: "space-around", padding: "8px 0 calc(8px + env(safe-area-inset-bottom))" }}>
        {[["events", t.events, Clock], ["faves", t.faves, MapPin], ["saved", t.savedTab, Heart]].map(([k, label, Ic]) => (
          <button key={k} onClick={() => setView(k)} aria-pressed={view === k}
            style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              color: view === k ? P.coral : P.inkSoft, fontSize: 11, fontWeight: 700, position: "relative", minWidth: 66 }}>
            <Ic size={21} fill={k === "saved" && view === k ? P.coral : "none"} />
            {label}
            {k === "saved" && (saved.size + savedPlaces.size) > 0 &&
              <span style={{ position: "absolute", top: -3, right: 14, fontSize: 10, fontWeight: 700, color: "#fff", background: P.coral, borderRadius: 999, padding: "0 5px" }}>{saved.size + savedPlaces.size}</span>}
          </button>
        ))}
      </nav>

      {detail && (
        <EventDetail e={detail} lang={lang} t={t} P={P} saved={saved.has(detail.id)}
          onSave={() => toggle(setSaved, saved, detail.id)} onClose={() => setDetail(null)} />
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

/* ---- Place card (Local Picks + Saved) ---------------------------- */
function PlaceCard({ it, lang, t, P, saved, onSave }) {
  const cat = CATS[it.cat] || { c: P.coral, es: "", en: "", Icon: Utensils };
  const Bi = it.list === "bar" ? Wine : it.list === "live" ? Palette : it.cat === "mercados" ? Utensils : (cat.Icon || Utensils);
  return (
    <div className="card" style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative" }}>
        <Media img={it.img} cat={it.cat} iconSize={30} style={{ width: "100%", height: 150 }} />
        <span title={cat[lang]} style={{ position: "absolute", top: 10, left: 10, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center", boxShadow: "0 1px 5px rgba(0,0,0,.18)" }}>
          <Bi size={15} color={cat.c} />
        </span>
        <button onClick={onSave} aria-label={t.savedTip} aria-pressed={saved}
          style={{ position: "absolute", top: 10, right: 10, border: "none", cursor: "pointer",
            width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.92)",
            display: "grid", placeItems: "center", boxShadow: "0 1px 5px rgba(0,0,0,.18)" }}>
          <Heart size={17} color={P.coral} fill={saved ? P.coral : "none"} />
        </button>
      </div>
      <div style={{ padding: "12px 15px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: cat.c, textTransform: "uppercase", letterSpacing: ".05em" }}>{cat[lang]}</span>
        <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 700, margin: "3px 0 5px", lineHeight: 1.15, letterSpacing: "-.01em" }}>{it.name}</h3>
        {it[lang] && <p style={{ fontSize: 13, color: P.inkSoft, margin: "0 0 10px", lineHeight: 1.45 }}>{it[lang]}</p>}
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: P.inkSoft }}>
          <MapPin size={12} /> {it.area}
          {it.diet && it.diet.length > 0 && <span style={{ color: P.agave || "#2F7A63", fontWeight: 700, marginLeft: 6 }}>· {it.diet.includes("vegan") ? "Vegan" : "Veg"}</span>}
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
