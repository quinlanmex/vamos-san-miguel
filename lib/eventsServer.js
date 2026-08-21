import { supabaseAdmin } from "./supabaseAdmin";

// Server-side event data for the indexable /whats-on pages. Computes each event's next
// upcoming occurrence (rolled date, or from recurrence weekdays) so the pages read as a real,
// current calendar, and stays fresh automatically via revalidation.
const FIELDS = "id,title_en,blurb_en,category,start_date,end_date,start_time,venue,area,recurring,recur_days,recur_note,photo_url,origin_url,origin_name,lat,lng,price_en";

const CITY = "San Miguel de Allende";
export const CATEGORY_LABELS = {
  musica: "Music", cine: "Film", tours: "Tours", comunidad: "Community",
  charlas: "Talks", mercados: "Markets", bienestar: "Wellness",
};

const ymd = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
const parseYmd = (s) => { const [y, m, d] = String(s || "").slice(0, 10).split("-").map(Number); return (y && m && d) ? new Date(y, m - 1, d) : null; };

// The concrete upcoming date an event happens on: a real future date (or today if a multi-day
// event is underway), else the soonest weekday matching its recurrence, else null.
function nextOccurrence(e, today) {
  const s = parseYmd(e.start_date), en = parseYmd(e.end_date) || s;
  if (en && en >= today && s) return s < today ? today : s;
  if (e.recurring && Array.isArray(e.recur_days) && e.recur_days.length) {
    for (let i = 0; i < 7; i++) {
      const c = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      if (e.recur_days.includes(c.getDay())) return c;
    }
  }
  return null;
}

// All published events with a concrete upcoming occurrence within `days`, each annotated with
// its `occ` date + end, sorted by date. Undateable recurring events are excluded (SEO pages
// should only list things a visitor can actually plan around).
export async function getUpcomingEvents(days = 60) {
  let sb;
  try { sb = supabaseAdmin(); } catch { return []; }
  const { data, error } = await sb.from("events").select(FIELDS).eq("status", "published");
  if (error || !data) return [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  const out = [];
  for (const e of data) {
    const occ = nextOccurrence(e, today);
    if (!occ || occ > horizon) continue;
    const end = parseYmd(e.end_date);
    out.push({ ...e, occ, occEnd: (end && end >= occ) ? end : occ });
  }
  out.sort((a, b) => a.occ - b.occ || String(a.title_en).localeCompare(String(b.title_en)));
  return out;
}

// Events whose occurrence falls within [from, to] (inclusive), from an already-fetched list.
export const eventsBetween = (events, from, to) =>
  events.filter((e) => e.occEnd >= from && e.occ <= to);

// Events happening in a given calendar month (year, m = 0-indexed). Dated events are included
// when their range overlaps the month; recurring events with known weekdays are included once,
// anchored to their first upcoming occurrence in the month; other recurring events are included
// when their next occurrence lands in the month. Past dates are excluded.
export async function getEventsInMonth(year, m) {
  let sb;
  try { sb = supabaseAdmin(); } catch { return []; }
  const { data, error } = await sb.from("events").select(FIELDS).eq("status", "published");
  if (error || !data) return [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mStart = new Date(year, m, 1);
  const mEnd = new Date(year, m + 1, 0);
  const from = today > mStart ? today : mStart; // never list dates already passed
  const out = [];
  for (const e of data) {
    const s = parseYmd(e.start_date), en = parseYmd(e.end_date) || s;
    if (e.recurring && Array.isArray(e.recur_days) && e.recur_days.length) {
      let first = null;
      for (let day = 1; day <= mEnd.getDate(); day++) {
        const c = new Date(year, m, day);
        if (c >= from && e.recur_days.includes(c.getDay())) { first = c; break; }
      }
      if (first) out.push({ ...e, occ: first, occEnd: first });
    } else if (e.recurring) {
      const occ = nextOccurrence(e, today);
      if (occ && occ >= from && occ <= mEnd) out.push({ ...e, occ, occEnd: occ });
    } else if (s && en && en >= from && s <= mEnd) {
      out.push({ ...e, occ: s < from ? from : s, occEnd: en });
    }
  }
  out.sort((a, b) => a.occ - b.occ || String(a.title_en).localeCompare(String(b.title_en)));
  return out;
}

export { ymd, parseYmd, CITY };
