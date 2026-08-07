import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const CATS = ["musica", "cine", "tours", "comunidad", "charlas", "mercados", "bienestar"];

export async function POST(req) {
  const { event, password, discovered_via } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!event) return Response.json({ error: "No event provided." }, { status: 400 });

  // Minimal validation before hitting the DB.
  if (!event.title_en || !event.title_es) return Response.json({ error: "Title (EN + ES) is required." }, { status: 400 });
  if (!CATS.includes(event.category)) return Response.json({ error: "Pick a valid category." }, { status: 400 });
  if (!event.start_date) return Response.json({ error: "Start date is required." }, { status: 400 });

  const row = {
    status: "published",
    title_en: event.title_en,
    title_es: event.title_es,
    blurb_en: event.blurb_en || null,
    blurb_es: event.blurb_es || null,
    price_en: event.price_en || null,
    price_es: event.price_es || null,
    category: event.category,
    audience: Array.isArray(event.audience) ? event.audience : [],
    start_date: event.start_date,
    end_date: event.end_date || event.start_date,
    start_time: event.start_time || null,
    recurring: !!event.recurring,
    venue: event.venue || null,
    area: event.area || null,
    origin_name: event.origin_name || null,
    origin_url: event.origin_url || null,
    discovered_via: discovered_via || "paste",
    photo_url: event.photo_url || null,
  };

  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("events").insert(row).select("id").single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ id: data.id });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
