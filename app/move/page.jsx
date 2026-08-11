import Link from "next/link";
import PageShell from "../../components/PageShell";
import { getMovePages } from "../../lib/content";

export const metadata = {
  title: "Moving to San Miguel de Allende: The Complete Guide | Vamos San Miguel",
  description: "A practical, honest guide to moving to San Miguel de Allende, Mexico: the money case, taxes, visas and residency, cost of living, healthcare, safety, housing, and daily life.",
  alternates: { canonical: "/move" },
  openGraph: {
    title: "Moving to San Miguel de Allende: The Complete Guide",
    description: "The money case, taxes, visas, cost of living, healthcare, safety, and daily life in San Miguel de Allende.",
    type: "website",
  },
};

export default function MoveHub() {
  const pages = getMovePages();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Moving to San Miguel de Allende: The Complete Guide",
    description: metadata.description,
    hasPart: pages.map((p) => ({ "@type": "Article", headline: p.title, url: `/move/${p.slug}` })),
  };

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "#B4791F", margin: "0 0 8px" }}>
        San Miguel de Allende · Move Here
      </p>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(28px, 4.5vw, 40px)", lineHeight: 1.06, margin: "0 0 12px", letterSpacing: "-.01em" }}>
        Thinking about moving to San Miguel de Allende?
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: "#3A3125", margin: "0 0 30px", maxWidth: "60ch" }}>
        We did it, and we wrote down everything we wish we had known first. Start anywhere. Each guide is honest about the tradeoffs, not just the postcard.
      </p>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {pages.map((p) => (
          <Link key={p.slug} href={`/move/${p.slug}`}
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
