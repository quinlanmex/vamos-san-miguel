import Link from "next/link";
import PageShell from "../../components/PageShell";
import { allCollections } from "../../lib/collections";

export const metadata = {
  title: "Local Shortlists & Best-Of Guides | Vamos San Miguel",
  description: "Locals' shortlists for San Miguel de Allende — the best rooftop bars, coffee shops, date-night restaurants, spas and more, each ranked with an honest take.",
  alternates: { canonical: "/guide" },
};

export default function GuideIndex() {
  const cols = allCollections();
  return (
    <PageShell active="plan">
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, lineHeight: 1.12, margin: "0 0 8px", color: "#0D1B36" }}>Local shortlists</h1>
      <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#3A3226", margin: "0 0 18px" }}>
        The short answer to the questions people actually ask about San Miguel — each list is our real picks, ranked, with the honest take. Never sponsored.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {cols.map((c) => (
          <Link key={c.slug} href={`/guide/${c.slug}`}
            style={{ display: "block", textDecoration: "none", background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 13, padding: "14px 16px" }}>
            <span style={{ display: "block", fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: "#0D1B36", marginBottom: 2 }}>{c.h1}</span>
            <span style={{ fontSize: 13.5, color: "#6E604F", lineHeight: 1.45 }}>{c.desc}</span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
