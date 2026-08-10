import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const CATS = ["musica", "cine", "tours", "comunidad", "charlas", "mercados", "bienestar"];
const LISTS = ["rest", "bar", "live"];

export async function POST(req) {
  const { record, password, kind = "event", discovered_via } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!record) return Response.json({ error: "Nothing to publish." }, { status: 400 });

  let table, row;

  if (kind === "place") {
    if (!record.name) return Response.json({ error: "Name is required." }, { status: 400 });
    if (!CATS.includes(record.category)) return Response.json({ error: "Pick a valid category." }, { status: 400 });
    if (!LISTS.includes(record.list_key)) return Response.json({ error: "Pick a list (Restaurant / Bar / Live music)." }, { status: 400 });
    table = "places";
    row = {
      status: "published",
      editorial: true,
      list_key: record.list_key,
      name: record.name,
      desc_en: record.desc_en || null,
      desc_es: record.desc_es || null,
      category: record.category,
      audience: Array.isArray(record.audience) ? record.audience : [],
      diet: Array.isArray(record.diet) ? record.diet : [],
      area: record.area || null,
      origin_url: record.origin_url || null,
      photo_url: record.photo_url || null,
    };
  } else {
    if (!record.title_en || !record.title_es) return Response.json({ error: "Title (EN + ES) is required." }, { status: 400 });
    if (!CATS.includes(record.category)) return Response.json({ error: "Pick a valid category." }, { status: 400 });
    if (!record.start_date) return Response.json({ error: "Start date is required." }, { status: 400 });
    table = "events";
    row = {
      status: "published",
      title_en: record.title_en,
      title_es: record.title_es,
      blurb_en: record.blurb_en || null,
      blurb_es: record.blurb_es || null,
      price_en: record.price_en || null,
      price_es: record.price_es || null,
      category: record.category,
      audience: Array.isArray(record.audience) ? record.audience : [],
      start_date: record.start_date,
      end_date: record.end_date || record.start_date,
      start_time: record.start_time || null,
      recurring: !!record.recurring,
      venue: record.venue || null,
      area: record.area || null,
      origin_name: record.origin_name || null,
      origin_url: record.origin_url || null,
      discovered_via: discovered_via || "paste",
      photo_url: record.photo_url || null,
    };
  }

  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from(table).insert(row).select("id").single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ id: data.id });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
