import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const EVENT_COLS = ["status", "title_en", "title_es", "blurb_en", "blurb_es", "price_en", "price_es",
  "category", "audience", "start_date", "end_date", "start_time", "recurring", "venue", "area",
  "origin_name", "origin_url", "discovered_via", "photo_url", "lat", "lng"];
const PLACE_COLS = ["status", "editorial", "list_key", "name", "desc_en", "desc_es", "category",
  "audience", "diet", "cuisine", "area", "lat", "lng", "origin_name", "origin_url", "google_place_id",
  "source_ref", "photo_url", "photos", "phone", "hours", "price_level", "tip", "business_status", "featured", "featured_rank",
  "why_love", "what_to_order", "best_time",
  "tip_es", "why_love_es", "what_to_order_es", "best_time_es"];

function clean(record, cols) {
  const out = {};
  for (const k of cols) if (record[k] !== undefined) out[k] = record[k] === "" ? null : record[k];
  return out;
}

export async function POST(req) {
  const { password, action, kind = "place", id, record } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let sb;
  try { sb = supabaseAdmin(); } catch (e) { return Response.json({ error: String(e.message || e) }, { status: 500 }); }

  const table = kind === "event" ? "events" : "places";
  const cols = kind === "event" ? EVENT_COLS : PLACE_COLS;

  try {
    if (action === "list") {
      const ev = await sb.from("events").select("*").order("start_date", { ascending: true });
      const pl = await sb.from("places").select("*").order("name", { ascending: true });
      if (ev.error) return Response.json({ error: ev.error.message }, { status: 500 });
      if (pl.error) return Response.json({ error: pl.error.message }, { status: 500 });
      return Response.json({ events: ev.data || [], places: pl.data || [] });
    }

    if (action === "setStatus") {
      if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
      const status = record && record.status;
      if (!status) return Response.json({ error: "Missing status." }, { status: 400 });
      const { error } = await sb.from(table).update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true, id, status });
    }

    // Lightweight partial update (inline edits): whitelisted fields only, no name requirement.
    if (action === "patch") {
      if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
      const row = clean(record || {}, cols);
      if (!Object.keys(row).length) return Response.json({ error: "Nothing to update." }, { status: 400 });
      if (Object.prototype.hasOwnProperty.call(row, "business_status")) {
        row.closed_at = row.business_status === "CLOSED_PERMANENTLY" ? new Date().toISOString() : null;
        if (row.business_status === "CLOSED_PERMANENTLY") row.status = "hidden";
      }
      row.updated_at = new Date().toISOString();
      const { error } = await sb.from(table).update(row).eq("id", id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true, id });
    }

    if (action === "delete") {
      if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    if (action === "save") {
      const row = clean(record || {}, cols);
      if (kind === "place") {
        row.editorial = true;
        if (row.name == null) return Response.json({ error: "Name is required." }, { status: 400 });
        // Manually marking a place permanently closed stamps closed_at and hides it; reopening clears it.
        if (record && Object.prototype.hasOwnProperty.call(record, "business_status")) {
          if (record.business_status === "CLOSED_PERMANENTLY") { row.closed_at = new Date().toISOString(); row.status = "hidden"; }
          else { row.closed_at = null; }
        }
      }
      else { if (row.title_en == null && row.title_es == null) return Response.json({ error: "A title is required." }, { status: 400 }); if (!row.end_date && row.start_date) row.end_date = row.start_date; }
      row.updated_at = new Date().toISOString();
      if (id) {
        const { error } = await sb.from(table).update(row).eq("id", id);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true, id });
      }
      if (row.status == null) row.status = "published";
      const { data, error } = await sb.from(table).insert(row).select("id").single();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true, id: data.id });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
