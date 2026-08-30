import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { H2, P, PickBlock, FaqList, PlanCTA, pickTake } from "../../../components/PickBits";
import { getPicks } from "../../../lib/picksServer";
import { allCollections, getCollection, matchesCollection } from "../../../lib/collections";

// Programmatic "best of" landing pages built from the picks data. See lib/collections.js.
export const revalidate = 1800;
const BASE = "https://vamossanmiguel.com";

export function generateStaticParams() {
  return allCollections().map((c) => ({ topic: c.slug }));
}

export async function generateMetadata({ params }) {
  const c = getCollection(params.topic);
  if (!c) return { title: "Not found | Vamos San Miguel" };
  return {
    title: `${c.title} | Vamos San Miguel`,
    description: c.desc,
    alternates: { canonical: `/guide/${c.slug}` },
    openGraph: { title: c.h1, description: c.desc, type: "article", url: `${BASE}/guide/${c.slug}` },
  };
}

function rank(picks, limit) {
  return picks
    .filter((p) => pickTake(p))
    .sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5) || (a.featured_rank ?? 9999) - (b.featured_rank ?? 9999))
    .slice(0, limit);
}

export default async function CollectionPage({ params }) {
  const c = getCollection(params.topic);
  if (!c) notFound();
  const all = await getPicks().catch(() => []);
  const picks = rank(all.filter((p) => matchesCollection(p, c.match)), c.limit || 12);
  const related = allCollections().filter((x) => x.slug !== c.slug).slice(0, 5);

  const breadcrumbLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE },
    { "@type": "ListItem", position: 2, name: "Guides", item: `${BASE}/guide` },
    { "@type": "ListItem", position: 3, name: c.h1, item: `${BASE}/guide/${c.slug}` },
  ] };
  const itemListLd = picks.length ? { "@context": "https://schema.org", "@type": "ItemList", name: c.h1, itemListElement: picks.map((p, i) => ({
    "@type": "ListItem", position: i + 1, name: p.name,
    item: { "@type": "LocalBusiness", name: p.name, address: p.area ? { "@type": "PostalAddress", addressLocality: p.area, addressRegion: "Guanajuato", addressCountry: "MX" } : undefined, image: p.photo_url || undefined, description: pickTake(p).slice(0, 300) || undefined },
  })) } : null;
  const faqLd = c.faqs?.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;

  return (
    <PageShell active="plan">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {itemListLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />}
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <p style={{ fontSize: 13.5, margin: "0 0 12px", color: "#6E604F" }}>
        <Link href="/guide" style={{ color: "#0D1B36", textDecoration: "none", fontWeight: 600 }}>← All guides</Link>
      </p>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, lineHeight: 1.12, margin: "0 0 12px", color: "#0D1B36" }}>{c.h1}</h1>
      <P>{c.intro}</P>

      {picks.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          <PickBlock picks={picks} ranked />
          <p style={{ fontSize: 13.5, color: "#6E604F", margin: "2px 0 0" }}>Chosen by locals. Never sponsored. Tap any place to open it in the app with map, hours and photos.</p>
        </div>
      ) : (
        <div style={{ padding: "16px 18px", background: "#FFF", border: "1px dashed #E7DDCB", borderRadius: 13, margin: "8px 0" }}>
          <p style={{ margin: 0, fontSize: 14.5, color: "#5A4F40" }}>We're still vetting our shortlist for this one. In the meantime, browse all our <Link href="/" style={{ color: "#E06A63", fontWeight: 700, textDecoration: "none" }}>Local Picks →</Link></p>
        </div>
      )}

      {c.faqs?.length > 0 && (<><H2>Good to know</H2><FaqList faqs={c.faqs} /></>)}

      <H2>More local shortlists</H2>
      <div style={{ display: "grid", gap: 6, margin: "0 0 4px" }}>
        {related.map((r) => (
          <Link key={r.slug} href={`/guide/${r.slug}`} style={{ fontSize: 14.5, fontWeight: 600, color: "#0D1B36", textDecoration: "none", padding: "7px 0", borderTop: "1px solid #E7DDCB" }}>
            {r.h1} <span style={{ color: "#E06A63" }}>→</span>
          </Link>
        ))}
      </div>

      <PlanCTA />
    </PageShell>
  );
}
