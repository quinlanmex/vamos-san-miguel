import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { getEventsInMonth, CATEGORY_LABELS, CITY } from "../../../lib/eventsServer";

// Month archive pages ("events in San Miguel de Allende in August 2026") — long-tail, indexable,
// and self-refreshing from the live event data.
export const revalidate = 1800;

const BASE = "https://vamossanmiguel.com";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const fmtDay = (dt) => `${WEEKDAYS[dt.getDay()]}, ${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
const fmtTime = (t) => { if (!t) return null; const [h, m] = String(t).slice(0, 5).split(":").map(Number); const ap = h < 12 ? "am" : "pm"; return `${h % 12 || 12}:${String(m).padStart(2, "0")}${ap}`; };

// slug "august-2026" -> { m: 7, year: 2026 } (or null if not a valid month slug).
function parseSlug(slug) {
  const mth = String(slug || "").toLowerCase();
  const m = mth.match(/^([a-z]+)-(\d{4})$/);
  if (!m) return null;
  const idx = MONTHS.findIndex((x) => x.toLowerCase() === m[1]);
  if (idx < 0) return null;
  return { m: idx, year: Number(m[2]) };
}

export function generateStaticParams() {
  const now = new Date();
  return Array.from({ length: 4 }, (_, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { month: `${MONTHS[dt.getMonth()].toLowerCase()}-${dt.getFullYear()}` };
  });
}

export async function generateMetadata({ params }) {
  const p = parseSlug(params.month);
  if (!p) return { title: "Not found | Vamos San Miguel" };
  const label = `${MONTHS[p.m]} ${p.year}`;
  const title = `Events in ${CITY} in ${label}`;
  return {
    title: `${title} | Vamos San Miguel`,
    description: `What's on in ${CITY} in ${label}: concerts, markets, tours, talks and more, updated daily.`,
    alternates: { canonical: `/whats-on/${params.month}` },
    openGraph: { title, description: `Events in ${CITY} in ${label}.`, type: "website", url: `${BASE}/whats-on/${params.month}` },
  };
}

export default async function MonthPage({ params }) {
  const p = parseSlug(params.month);
  if (!p) notFound();
  const label = `${MONTHS[p.m]} ${p.year}`;
  const events = await getEventsInMonth(p.year, p.m);

  const eventLd = (e) => {
    const iso = (dt, t) => { const pt = t ? String(t).slice(0, 5) : "00:00"; return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}T${pt}:00`; };
    return {
      "@type": "Event", name: e.title_en, startDate: iso(e.occ, e.start_time),
      ...(e.occEnd > e.occ ? { endDate: iso(e.occEnd, null) } : {}),
      ...(e.blurb_en ? { description: e.blurb_en } : {}),
      location: { "@type": "Place", name: e.venue || CITY, address: { "@type": "PostalAddress", addressLocality: CITY, addressRegion: "Guanajuato", addressCountry: "MX" } },
      ...(e.origin_url ? { url: e.origin_url } : {}),
    };
  };
  const listLd = {
    "@context": "https://schema.org", "@type": "ItemList", name: `Events in ${CITY} in ${label}`,
    numberOfItems: events.length, itemListElement: events.slice(0, 100).map((e, i) => ({ "@type": "ListItem", position: i + 1, item: eventLd(e) })),
  };

  return (
    <PageShell active="events">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }} />

      <p style={{ fontSize: 13.5, margin: "0 0 14px", color: "#6E604F" }}>
        <Link href="/whats-on" style={{ color: "#0D1B36", textDecoration: "none", fontWeight: 600 }}>← What's on</Link>
      </p>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 33, lineHeight: 1.1, margin: "0 0 10px", color: "#0D1B36" }}>
        Events in {CITY} in {label}
      </h1>
      <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "#463A2C", margin: "0 0 24px" }}>
        Everything on in {CITY} this {MONTHS[p.m]} — live music, markets, gallery openings, tours, talks and wellness classes. Updated daily.
      </p>

      {events.length === 0 ? (
        <p style={{ fontSize: 15, color: "#6E604F" }}>No events listed for {label} yet. Check <Link href="/whats-on" style={{ color: "#E06A63", fontWeight: 600 }}>what's on now</Link>.</p>
      ) : (
        <div>
          {events.map((e) => {
            const cat = CATEGORY_LABELS[e.category] || "Event";
            const time = fmtTime(e.start_time);
            const where = [e.venue, e.area].filter(Boolean).join(" · ");
            const when = e.recurring ? ((e.recur_note && e.recur_note) || "Recurring") : fmtDay(e.occ);
            return (
              <div key={e.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderTop: "1px solid #E7DDCB" }}>
                <div style={{ flexShrink: 0, width: 52, textAlign: "center" }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, color: "#0D1B36", lineHeight: 1 }}>{e.occ.getDate()}</div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "#B4791F", fontWeight: 700 }}>{MONTHS[e.occ.getMonth()].slice(0, 3)}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#E06A63", textTransform: "uppercase", letterSpacing: ".04em" }}>{cat}{e.recurring ? " · Recurring" : ""}</span>
                  <h2 style={{ fontFamily: "Georgia, serif", fontSize: 18, margin: "2px 0 4px", color: "#0D1B36", lineHeight: 1.2 }}>{e.title_en}</h2>
                  {e.blurb_en && <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#5A4F40", margin: "0 0 5px" }}>{e.blurb_en}</p>}
                  <p style={{ fontSize: 12.5, color: "#6E604F", margin: 0 }}>{when}{time ? ` · ${time}` : ""}{where ? ` · ${where}` : ""}{e.price_en ? ` · ${e.price_en}` : ""}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 28, padding: "18px 20px", background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 14 }}>
        <p style={{ margin: 0, fontSize: 14.5, color: "#6E604F", lineHeight: 1.5 }}>
          See these on a map and filter by today, this weekend or category on the <Link href="/whats-on" style={{ color: "#E06A63", fontWeight: 600, textDecoration: "none" }}>live What's On page</Link>.
        </p>
      </div>
    </PageShell>
  );
}
