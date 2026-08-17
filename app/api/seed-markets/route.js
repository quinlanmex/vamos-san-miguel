import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

// One-shot: add Mercado Sano as an essential pick (its big organic market is Saturdays),
// and set any "Tianguis de los Martes" (Tuesday market) event to recommended priority.
// Idempotent: skips the pick if it already exists; only sets event priority when unset.
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

async function findPlace(query, key) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=mx&key=${key}`;
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (j.status !== "OK" || !j.results || !j.results.length) return null;
  const p = j.results[0];
  const loc = p.geometry && p.geometry.location;
  const photoRef = p.photos && p.photos[0] && p.photos[0].photo_reference;
  return {
    place_id: p.place_id || null,
    lat: loc ? loc.lat : null, lng: loc ? loc.lng : null,
    photo_url: photoRef ? `/api/place-photo?ref=${encodeURIComponent(photoRef)}` : null,
  };
}

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const sb = supabaseAdmin();
  const out = { pick: null, market_event: null, events: 0 };

  // 1. Mercado Sano the PLACE (shopping). Its Saturday market is a separate event below.
  const { data: places } = await sb.from("places").select("id, name");
  const exists = (places || []).some((p) => norm(p.name).includes("mercado sano"));
  let g = null;
  if (key) g = await findPlace("Mercado Sano San Miguel de Allende", key);
  if (exists) {
    out.pick = "already exists";
  } else if (!key) {
    out.pick = "skipped (no Google key)";
  } else {
    const { error } = await sb.from("places").insert({
      status: "published", editorial: true, list_key: "shopping", category: "mercados",
      name: "Mercado Sano",
      desc_en: "A beloved organic market and food hall on Ancha de San Antonio, with produce stalls, herbal remedies, bakeries, and healthy cafes.",
      desc_es: "Un querido mercado organico y patio de comidas en Ancha de San Antonio, con puestos de verduras, remedios herbales, panaderias y cafes saludables.",
      audience: [], diet: ["vegetarian"], cuisine: ["wellness"],
      lat: g ? g.lat : null, lng: g ? g.lng : null,
      google_place_id: g ? g.place_id : null, photo_url: g ? g.photo_url : null,
    });
    out.pick = error ? `error: ${error.message}` : "added (shopping)";
  }

  // 2. Mercado Sano Saturday Market as a recurring EVENT (essential).
  const { data: evAll } = await sb.from("events").select("id, title_en");
  const hasMarketEvent = (evAll || []).some((e) => norm(e.title_en).includes("mercado sano"));
  if (hasMarketEvent) {
    out.market_event = "already exists";
  } else {
    const { data: ins, error } = await sb.from("events").insert({
      status: "published", recurring: true, category: "mercados",
      title_en: "Mercado Sano Saturday Market",
      title_es: "Mercado Sano Mercado de los Sabados",
      blurb_en: "The weekly organic tianguis fills Mercado Sano's courtyard every Saturday morning, with local produce, prepared food, and artisan goods.",
      blurb_es: "El tianguis organico semanal llena el patio de Mercado Sano cada sabado por la manana, con productos locales, comida preparada y articulos artesanales.",
      venue: "Mercado Sano", area: "Centro",
      lat: g ? g.lat : null, lng: g ? g.lng : null,
    }).select("id").single();
    if (error) {
      out.market_event = `error: ${error.message}`;
    } else {
      // Priority is best-effort: the column may not be migrated yet.
      const { error: pErr } = await sb.from("events").update({ priority: 1 }).eq("id", ins.id);
      out.market_event = pErr ? "added (priority pending: run add-event-priority.sql)" : "added (essential)";
    }
  }

  // 3. Tuesday Tianguis event(s) -> recommended.
  const { data: events, error: evErr } = await sb.from("events").select("id, title_en, priority");
  if (!evErr) {
    const targets = (events || []).filter((e) => norm(e.title_en).includes("tianguis") && e.priority == null);
    for (const e of targets) {
      const { error } = await sb.from("events").update({ priority: 2 }).eq("id", e.id);
      if (!error) out.events++;
    }
  } else {
    out.eventsNote = "events.priority not migrated yet (run add-event-priority.sql first)";
  }

  return Response.json({ ok: true, ...out });
}
