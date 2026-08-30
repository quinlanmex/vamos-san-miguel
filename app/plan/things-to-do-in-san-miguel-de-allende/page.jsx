import Link from "next/link";
import PageShell from "../../../components/PageShell";
import { H2, P, PickBlock, BestOfRow, EventList, FaqList, PlanCTA, InlineLink } from "../../../components/PickBits";
import { getBestOfCategories, dbToUrlSlug } from "../../../lib/bestOf";
import { getPicks, picksByType, picksByFacet } from "../../../lib/picksServer";
import { getUpcomingEvents } from "../../../lib/eventsServer";
import { allCollections } from "../../../lib/collections";

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

export default async function ThingsToDoPage() {
  const [cats, picks, events] = await Promise.all([
    getBestOfCategories().catch(() => []),
    getPicks().catch(() => []),
    getUpcomingEvents(14).catch(() => []),
  ]);
  const bestItems = cats.filter((c) => c.winner).slice(0, 6).map((c) => ({
    href: `/best/${dbToUrlSlug(c.slug)}`, label: c.label_en, name: c.winner.name, photo_url: c.winner.photo_url,
  }));
  const eats = picksByType(picks, "rest", { limit: 3 });
  const rooftops = picksByFacet(picks, "views", 3);
  const bars = rooftops.length ? [] : picksByType(picks, "bar", { limit: 2 });
  const outdoors = picksByFacet(picks, "wellness", 2);
  const weekEvents = events.slice(0, 5);
  const shortlists = allCollections().slice(0, 6);

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
          <p style={{ fontSize: 14.5, margin: "2px 0 6px" }}><InlineLink href="/">See all our Local Picks →</InlineLink></p>
        </>
      )}

      {bestItems.length > 0 && (
        <>
          <H2>The best of, decided</H2>
          <P>When you only get one shot at a category, these are our picks, chosen by locals and never sponsored.</P>
          <BestOfRow items={bestItems} />
          <p style={{ fontSize: 14.5, margin: "2px 0 6px" }}><InlineLink href="/best">Browse all best-of picks →</InlineLink></p>
        </>
      )}

      {weekEvents.length > 0 && (
        <>
          <H2>What's on while you're here</H2>
          <P>Half the fun is timing your visit to something. Here is a taste of the next couple of weeks, updated daily.</P>
          <EventList events={weekEvents} />
          <p style={{ fontSize: 14.5, margin: "2px 0 6px" }}><InlineLink href="/whats-on">See the full What's On calendar →</InlineLink></p>
        </>
      )}

      <H2>Local shortlists, by category</H2>
      <P>Looking for one specific thing? These are our ranked shortlists, each with the honest take.</P>
      <div style={{ display: "grid", gap: 6, margin: "0 0 4px" }}>
        {shortlists.map((c) => (
          <Link key={c.slug} href={`/guide/${c.slug}`} style={{ fontSize: 14.5, fontWeight: 600, color: "#0D1B36", textDecoration: "none", padding: "7px 0", borderTop: "1px solid #E7DDCB" }}>
            {c.h1} <span style={{ color: "#E06A63" }}>→</span>
          </Link>
        ))}
      </div>

      <H2>How many days do you need?</H2>
      <P>
        Three days is the sweet spot. Two lets you cover Centro, the Parroquia, El Jardin and a rooftop sunset with a couple of good meals. A third opens up Fabrica La Aurora, El Charco del Ingenio, and a slower pace, or a half-day out to the Atotonilco sanctuary and the hot springs nearby. With more time, San Miguel is a great base for day trips to Guanajuato City and Dolores Hidalgo. Our <InlineLink href="/plan/3-days-in-san-miguel-de-allende">3-day itinerary</InlineLink> and <InlineLink href="/plan/best-day-trips-from-san-miguel-de-allende">day-trips guide</InlineLink> map out a longer stay.
      </P>

      <H2>Frequently asked questions</H2>
      <FaqList faqs={faqs} />

      <PlanCTA />
    </PageShell>
  );
}
