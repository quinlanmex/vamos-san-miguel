import Link from "next/link";
import PageShell from "../../components/PageShell";
import { getPlanArticles } from "../../lib/articles";

// Content comes from the DB (Google Docs sync); re-fetch every 5 min so edits
// appear without a redeploy.
export const revalidate = 300;

export const metadata = {
  title: "Plan Your Trip to San Miguel de Allende | Vamos San Miguel",
  description: "A local's guide to planning a trip to San Miguel de Allende: the best things to do, where to eat and stay, a 3-day itinerary, day trips, and getting around.",
  alternates: { canonical: "/plan" },
  openGraph: {
    title: "Plan Your Trip to San Miguel de Allende",
    description: "Things to do, where to eat and stay, itineraries, day trips, and getting around.",
    type: "website",
  },
};

export default async function PlanHub() {
  const pages = await getPlanArticles();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Plan Your Trip to San Miguel de Allende",
    description: metadata.description,
    hasPart: pages.map((p) => ({ "@type": "Article", headline: p.title, url: `/plan/${p.slug}` })),
  };

  return (
    <PageShell active="plan">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "#B4791F", margin: "0 0 8px" }}>
        San Miguel de Allende · Plan your trip
      </p>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(28px, 4.5vw, 40px)", lineHeight: 1.06, margin: "0 0 12px", letterSpacing: "-.01em" }}>
        Everything you need to plan the trip
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: "#3A3125", margin: "0 0 30px", maxWidth: "60ch" }}>
        The guides we hand our own visiting friends. What to see, where to eat and sleep, how to get here, and where to go when you have an extra day.
      </p>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {pages.map((p) => (
          <Link key={p.slug} href={`/plan/${p.slug}`}
            style={{ display: "block", textDecoration: "none", color: "inherit", background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 14, padding: "16px 17px" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 19, margin: "0 0 6px", lineHeight: 1.2, color: "#0D1B36" }}>{p.title}</h2>
            {p.description && <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#6E604F", margin: 0 }}>{p.description}</p>}
            <span style={{ display: "inline-block", marginTop: 10, fontSize: 13, fontWeight: 700, color: "#E06A63" }}>Read the guide →</span>
          </Link>
        ))}
      </div>
      {pages.length === 0 && <p style={{ color: "#6E604F" }}>Guides are coming soon.</p>}
    </PageShell>
  );
}
