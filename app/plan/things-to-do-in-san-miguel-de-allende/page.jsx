import Link from "next/link";
import PageShell from "../../../components/PageShell";
import { getBestOfCategories, dbToUrlSlug } from "../../../lib/bestOf";
import { getPicks, picksByType, picksByFacet, takeOf } from "../../../lib/picksServer";
import { getUpcomingEvents } from "../../../lib/eventsServer";

// The flagship "things to do" guide. Unlike a static article, it names our real Local Picks and
// quotes their opinionated local take, folds in the best-of winners and the live event calendar,
// so it is specific, current, and impossible for an AI to reproduce. Refreshes on its own.
export const revalidate = 1800;

const BASE = "https://vamossanmiguel.com";
const CITY = "San Miguel de Allende";
const TITLE = `The Best Things to Do in ${CITY}`;

export const metadata = {
  title: `${TITLE} (from Locals) | Vamos San Miguel`,
  description: `A local's guide to the best things to do in ${CITY} — the sights that matter, plus the exact restaurants, rooftops, galleries and tours we send friends to, and what's on this week.`,
  alternates: { canonical: "/plan/things-to-do-in-san-miguel-de-allende" },
  openGraph: { title: TITLE, description: `The real short list for ${CITY}, from locals.`, type: "article", url: `${BASE}/plan/things-to-do-in-san-miguel-de-allende` },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function PickCard({ p }) {
  return (
    <div style={{ display: "flex", gap: 13, background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 13, padding: 12, marginBottom: 10 }}>
      {p.photo_url
        ? <img src={p.photo_url} alt={p.name} loading="lazy" style={{ width: 84, height: 84, borderRadius: 10, objectFit: "cover", flexShrink: 0, background: "#EFE7D8" }} />
        : <span style={{ width: 84, height: 84, borderRadius: 10, background: "linear-gradient(135deg,#E06A63,#F2A100)", flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: 18, margin: "0 0 1px", color: "#0D1B36", lineHeight: 1.15 }}>{p.name}</h3>
        {p.area && <p style={{ fontSize: 11.5, fontWeight: 700, color: "#B4791F", margin: "0 0 5px", textTransform: "uppercase", letterSpacing: ".04em" }}>{p.area}</p>}
        <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#3A3226", margin: 0 }}>{takeOf(p).slice(0, 220)}</p>
        <Link href={`/?place=${encodeURIComponent(p.name)}`} style={{ display: "inline-block", marginTop: 6, fontSize: 12.5, fontWeight: 700, color: "#E06A63", textDecoration: "none" }}>Open in the app →</Link>
      </div>
    </div>
  );
}

const H2 = ({ children }) => <h2 style={{ fontFamily: "Georgia, serif", fontSize: 25, margin: "34px 0 8px", color: "#0D1B36", lineHeight: 1.15 }}>{children}</h2>;
const P = ({ children }) => <p style={{ fontSize: 15.5, lineHeight: 1.62, color: "#3A3226", margin: "0 0 12px" }}>{children}</p>;

function PickBlock({ label, picks }) {
  if (!picks.length) return null;
  return (
    <div style={{ margin: "6px 0 18px" }}>
      <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#B4791F", margin: "0 0 8px" }}>{label}</p>
      {picks.map((p) => <PickCard key={p.id} p={p} />)}
    </div>
  );
}

export default async function ThingsToDoPage() {
  const [cats, picks, events] = await Promise.all([
    getBestOfCategories().catch(() => []),
    getPicks().catch(() => []),
    getUpcomingEvents(14).catch(() => []),
  ]);
  const bestWinners = cats.filter((c) => c.winner).slice(0, 6);
  const eats = picksByType(picks, "rest", { limit: 3 });
  const rooftops = picksByFacet(picks, "views", 3);
  const bars = rooftops.length ? [] : picksByType(picks, "bar", { limit: 2 });
  const outdoors = picksByFacet(picks, "wellness", 2);
  const weekEvents = events.slice(0, 5);

  const faqs = [
    { q: `What is the number one attraction in ${CITY}?`, a: `The Parroquia de San Miguel Arcangel, the pink neo-Gothic parish church overlooking El Jardin. Its spires are the emblem of the town and the natural first stop.` },
    { q: `Is ${CITY} walkable?`, a: `Yes. The Centro Historico is very walkable and most sights sit a short stroll from El Jardin. Wear sturdy shoes for the cobblestones, and take a taxi or Uber for the outer neighborhoods and countryside.` },
    { q: `How many days do you need in ${CITY}?`, a: `Three days is the sweet spot: two to cover Centro, the Parroquia, El Jardin and a rooftop sunset, and a third for Fabrica La Aurora, El Charco del Ingenio, and a slower pace or a day trip.` },
    { q: `What is the best time to visit ${CITY}?`, a: `The dry season from November through April brings the most reliable weather and the biggest festivals, but it is also busiest. The shoulder months are quieter and just as pleasant.` },
  ];
  const articleLd = { "@context": "https://schema.org", "@type": "Article", headline: TITLE, inLanguage: "en", author: { "@type": "Organization", name: "Vamos San Miguel" }, publisher: { "@type": "Organization", name: "Vamos San Miguel" }, mainEntityOfPage: `${BASE}/plan/things-to-do-in-san-miguel-de-allende` };
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };

  return (
    <PageShell active="plan">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <p style={{ fontSize: 13.5, margin: "0 0 12px", color: "#6E604F" }}>
        <Link href="/plan" style={{ color: "#0D1B36", textDecoration: "none", fontWeight: 600 }}>← Plan your trip</Link>
      </p>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 34, lineHeight: 1.1, margin: "0 0 12px", color: "#0D1B36" }}>{TITLE}</h1>

      <P>
        San Miguel rewards slow days. You can spend a morning lost in cobblestone lanes, an afternoon in galleries and rooftop cafes, and an evening watching the pink spires of the Parroquia catch the last light over El Jardin. Below are the sights that actually matter, and then the part most guides skip: the exact places we send our own friends to.
      </P>

      <H2>The essentials, first</H2>
      <P>
        Start in the Centro Historico and let it unfold. First-timers want five things: the <strong>Parroquia de San Miguel Arcangel</strong> (the neo-Gothic church that is the symbol of the town), the daily life of <strong>El Jardin</strong>, the galleries of <strong>Fabrica La Aurora</strong> (a former textile factory now full of studios and design shops), the cacti and canyon trails of <strong>El Charco del Ingenio</strong> botanical garden, and a <strong>rooftop sunset</strong> over the domes. That is an easy, unhurried first day and a half.
      </P>

      {(eats.length > 0 || rooftops.length > 0 || bars.length > 0) && (
        <>
          <H2>Where we actually send people</H2>
          <P>The landmarks are the easy part. Here is the short list of specific spots we vouch for, with the honest take on each.</P>
          <PickBlock label="For a meal" picks={eats} />
          <PickBlock label={rooftops.length ? "For a rooftop drink + the view" : "For a drink"} picks={rooftops.length ? rooftops : bars} />
          <PickBlock label="For a slow reset" picks={outdoors} />
          <p style={{ fontSize: 14.5, margin: "2px 0 6px" }}>
            <Link href="/" style={{ color: "#E06A63", fontWeight: 700, textDecoration: "none" }}>See all our Local Picks →</Link>
          </p>
        </>
      )}

      {bestWinners.length > 0 && (
        <>
          <H2>The best of, decided</H2>
          <P>When you only get one shot at a category, these are our picks, chosen by locals and never sponsored.</P>
          <div style={{ display: "grid", gap: 8, margin: "0 0 8px" }}>
            {bestWinners.map((c) => (
              <Link key={c.slug} href={`/best/${dbToUrlSlug(c.slug)}`}
                style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: "inherit", background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 12, padding: 11 }}>
                {c.winner.photo_url
                  ? <img src={c.winner.photo_url} alt="" loading="lazy" style={{ width: 44, height: 44, borderRadius: 9, objectFit: "cover", flexShrink: 0, background: "#EFE7D8" }} />
                  : <span style={{ width: 44, height: 44, borderRadius: 9, background: "#EFE7D8", flexShrink: 0 }} />}
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#E06A63", textTransform: "uppercase", letterSpacing: ".04em" }}>{c.label_en}</span>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: "#0D1B36" }}>{c.winner.name}</span>
                </span>
              </Link>
            ))}
          </div>
          <p style={{ fontSize: 14.5, margin: "2px 0 6px" }}><Link href="/best" style={{ color: "#E06A63", fontWeight: 700, textDecoration: "none" }}>Browse all best-of picks →</Link></p>
        </>
      )}

      {weekEvents.length > 0 && (
        <>
          <H2>What's on while you're here</H2>
          <P>Half the fun is timing your visit to something. Here is a taste of the next couple of weeks, updated daily.</P>
          <div style={{ margin: "0 0 8px" }}>
            {weekEvents.map((e) => (
              <div key={e.id} style={{ display: "flex", gap: 12, padding: "9px 0", borderTop: "1px solid #E7DDCB" }}>
                <div style={{ flexShrink: 0, width: 44, textAlign: "center" }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 800, color: "#0D1B36", lineHeight: 1 }}>{e.occ.getDate()}</div>
                  <div style={{ fontSize: 10.5, textTransform: "uppercase", color: "#B4791F", fontWeight: 700 }}>{MONTHS[e.occ.getMonth()]}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontFamily: "Georgia, serif", fontSize: 16, margin: 0, color: "#0D1B36", lineHeight: 1.2 }}>{e.title_en}</h3>
                  {e.venue && <p style={{ fontSize: 12.5, color: "#6E604F", margin: "1px 0 0" }}>{e.venue}</p>}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 14.5, margin: "2px 0 6px" }}><Link href="/whats-on" style={{ color: "#E06A63", fontWeight: 700, textDecoration: "none" }}>See the full What's On calendar →</Link></p>
        </>
      )}

      <H2>How many days do you need?</H2>
      <P>
        Three days is the sweet spot. Two lets you cover Centro, the Parroquia, El Jardin and a rooftop sunset with a couple of good meals. A third opens up Fabrica La Aurora, El Charco del Ingenio, and a slower pace, or a half-day out to the Atotonilco sanctuary and the hot springs nearby. With more time, San Miguel is a great base for day trips to Guanajuato City and Dolores Hidalgo. Our <Link href="/plan/3-days-in-san-miguel-de-allende" style={{ color: "#E06A63", fontWeight: 600, textDecoration: "none" }}>3-day itinerary</Link> and <Link href="/plan/best-day-trips-from-san-miguel-de-allende" style={{ color: "#E06A63", fontWeight: 600, textDecoration: "none" }}>day-trips guide</Link> map out a longer stay.
      </P>

      <H2>Frequently asked questions</H2>
      {faqs.map((f, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 15.5, fontWeight: 700, color: "#0D1B36", margin: "0 0 3px" }}>{f.q}</p>
          <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "#5A4F40", margin: 0 }}>{f.a}</p>
        </div>
      ))}

      <div style={{ marginTop: 30, padding: "20px 22px", background: "#0D1B36", color: "#F7F3EC", borderRadius: 16 }}>
        <p style={{ margin: "0 0 6px", fontFamily: "Georgia, serif", fontSize: 19, color: "#fff" }}>Let us plan the day for you</p>
        <p style={{ margin: "0 0 14px", fontSize: 14.5, lineHeight: 1.55, opacity: .92 }}>
          Tell our planner your dates and pace and it builds a San Miguel day around these picks, walking distances and all.
        </p>
        <Link href="/?planner=1" style={{ display: "inline-block", background: "#E06A63", color: "#fff", fontWeight: 700, fontSize: 14.5, padding: "10px 18px", borderRadius: 11, textDecoration: "none" }}>✨ Plan my trip →</Link>
      </div>
    </PageShell>
  );
}
