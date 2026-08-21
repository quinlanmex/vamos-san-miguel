import Link from "next/link";
import PageShell from "../../components/PageShell";
import { getUpcomingEvents, eventsBetween, CATEGORY_LABELS, CITY } from "../../lib/eventsServer";

// Indexable, self-refreshing calendar for "things to do in San Miguel de Allende". Built from
// the same live event data as the app, so it stays current for both search and AI engines.
export const revalidate = 1800;

const BASE = "https://vamossanmiguel.com";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const fmtDay = (dt) => `${WEEKDAYS[dt.getDay()]}, ${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
const fmtTime = (t) => {
  if (!t) return null;
  const [h, m] = String(t).slice(0, 5).split(":").map(Number);
  const ap = h < 12 ? "am" : "pm"; const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")}${ap}`;
};

export const metadata = {
  title: `What's On in ${CITY}: Events This Week | Vamos San Miguel`,
  description: `A live calendar of things to do in ${CITY} — concerts, markets, tours, talks and more, updated daily. See what's on today, this weekend, and the weeks ahead.`,
  alternates: { canonical: "/whats-on" },
  openGraph: { title: `What's On in ${CITY}`, description: `Live calendar of events in ${CITY}, updated daily.`, type: "website", url: `${BASE}/whats-on` },
};

function EventRow({ e }) {
  const cat = CATEGORY_LABELS[e.category] || "Event";
  const time = fmtTime(e.start_time);
  const where = [e.venue, e.area].filter(Boolean).join(" · ");
  return (
    <div style={{ display: "flex", gap: 14, padding: "14px 0", borderTop: "1px solid #E7DDCB" }}>
      <div style={{ flexShrink: 0, width: 52, textAlign: "center" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, color: "#0D1B36", lineHeight: 1 }}>{e.occ.getDate()}</div>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "#B4791F", fontWeight: 700 }}>{MONTHS[e.occ.getMonth()].slice(0, 3)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#E06A63", textTransform: "uppercase", letterSpacing: ".04em" }}>{cat}{e.recurring ? " · Recurring" : ""}</span>
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: 18, margin: "2px 0 4px", color: "#0D1B36", lineHeight: 1.2 }}>{e.title_en}</h3>
        {e.blurb_en && <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#5A4F40", margin: "0 0 5px" }}>{e.blurb_en}</p>}
        <p style={{ fontSize: 12.5, color: "#6E604F", margin: 0 }}>
          {fmtDay(e.occ)}{time ? ` · ${time}` : ""}{where ? ` · ${where}` : ""}{e.price_en ? ` · ${e.price_en}` : ""}
        </p>
      </div>
    </div>
  );
}

function Section({ title, events }) {
  if (!events.length) return null;
  return (
    <section style={{ marginBottom: 34 }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 23, margin: "0 0 4px", color: "#0D1B36" }}>{title}</h2>
      <p style={{ fontSize: 13, color: "#6E604F", margin: "0 0 6px" }}>{events.length} {events.length === 1 ? "event" : "events"}</p>
      <div>{events.map((e) => <EventRow key={e.id} e={e} />)}</div>
    </section>
  );
}

// schema.org Event for a single row (helps search + AI engines read the calendar).
const eventLd = (e) => {
  const iso = (dt, t) => { const p = t ? String(t).slice(0, 5) : "00:00"; return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}T${p}:00`; };
  return {
    "@type": "Event", name: e.title_en, startDate: iso(e.occ, e.start_time),
    ...(e.occEnd > e.occ ? { endDate: iso(e.occEnd, null) } : {}),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(e.blurb_en ? { description: e.blurb_en } : {}),
    ...(e.photo_url ? { image: `${BASE}${e.photo_url}` } : {}),
    location: { "@type": "Place", name: e.venue || CITY, address: { "@type": "PostalAddress", addressLocality: CITY, addressRegion: "Guanajuato", addressCountry: "MX" }, ...(e.lat && e.lng ? { geo: { "@type": "GeoCoordinates", latitude: e.lat, longitude: e.lng } } : {}) },
    ...(e.origin_url ? { url: e.origin_url } : {}),
  };
};

export default async function WhatsOnPage() {
  const events = await getUpcomingEvents(60);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = today.getDay();
  const satOff = dow === 0 ? -1 : (6 - dow);
  const weekendS = new Date(today.getFullYear(), today.getMonth(), today.getDate() + satOff);
  const weekendE = new Date(weekendS.getFullYear(), weekendS.getMonth(), weekendS.getDate() + 1);
  const week7 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);

  const todays = eventsBetween(events, today, today);
  const weekend = eventsBetween(events, weekendS, weekendE);
  const thisWeek = eventsBetween(events, today, week7);
  const later = events.filter((e) => e.occ > week7);

  const itemListLd = {
    "@context": "https://schema.org", "@type": "ItemList", name: `Events in ${CITY}`,
    numberOfItems: events.length,
    itemListElement: events.slice(0, 60).map((e, i) => ({ "@type": "ListItem", position: i + 1, item: eventLd(e) })),
  };

  return (
    <PageShell active="events">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />

      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 34, lineHeight: 1.1, margin: "0 0 10px", color: "#0D1B36" }}>
        What's on in {CITY}
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.55, color: "#463A2C", margin: "0 0 6px" }}>
        A live calendar of what to do in {CITY} right now — live music, gallery openings, markets, walking tours, talks and wellness classes. Updated every day.
      </p>
      <p style={{ fontSize: 13.5, color: "#6E604F", margin: "0 0 28px" }}>{events.length} upcoming events over the next 8 weeks.</p>

      {events.length === 0 ? (
        <p style={{ fontSize: 15, color: "#6E604F" }}>The calendar is refreshing. Check back shortly.</p>
      ) : (
        <>
          <Section title="Today" events={todays} />
          <Section title="This weekend" events={weekend} />
          <Section title="This week" events={thisWeek.filter((e) => !todays.includes(e) && !weekend.includes(e))} />
          <Section title="Coming up" events={later.slice(0, 40)} />
        </>
      )}

      {/* Browse by month — internal links to the month archive pages. */}
      <div style={{ marginTop: 10, marginBottom: 6 }}>
        <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#B4791F", margin: "0 0 10px" }}>Browse by month</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Array.from({ length: 4 }, (_, i) => {
            const dt = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const slug = `${MONTHS[dt.getMonth()].toLowerCase()}-${dt.getFullYear()}`;
            return (
              <Link key={slug} href={`/whats-on/${slug}`}
                style={{ display: "inline-block", background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 999, padding: "7px 15px", fontSize: 13.5, fontWeight: 600, color: "#0D1B36", textDecoration: "none" }}>
                {MONTHS[dt.getMonth()]} {dt.getFullYear()}
              </Link>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 24, padding: "20px 22px", background: "#0D1B36", color: "#F7F3EC", borderRadius: 16 }}>
        <p style={{ margin: "0 0 6px", fontFamily: "Georgia, serif", fontSize: 19, color: "#fff" }}>See it on the map, save what you like</p>
        <p style={{ margin: "0 0 14px", fontSize: 14.5, lineHeight: 1.55, opacity: .92 }}>
          Filter by today, this weekend, or category, view events on a map, and build a day around them with our planner.
        </p>
        <Link href="/?view=events" style={{ display: "inline-block", background: "#E06A63", color: "#fff", fontWeight: 700, fontSize: 14.5, padding: "10px 18px", borderRadius: 11, textDecoration: "none" }}>
          Open the live events map →
        </Link>
      </div>
    </PageShell>
  );
}
