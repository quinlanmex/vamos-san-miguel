import Link from "next/link";
import PageShell from "../../components/PageShell";

export const metadata = {
  title: "The Geography of Wealth — the book | Vamos San Miguel",
  description: "The book behind the Move Here guides: how moving to Mexico changes your money, your time, and who you get to be. A practical, honest playbook for geographic arbitrage and moving abroad.",
  alternates: { canonical: "/ebook" },
  openGraph: {
    title: "The Geography of Wealth",
    description: "How moving to Mexico changes your money, your time, and who you get to be.",
    type: "book",
  },
};

const INSIDE = [
  ["The money case", "Why geography is the biggest line item on your budget, and how the math changes when you move."],
  ["Taxes & the FEIE", "The Foreign Earned Income Exclusion, state domicile, and the legal framework, in plain language."],
  ["Visas & residency", "Temporary and permanent residency, income thresholds, and the paperwork, step by step."],
  ["Cost of living & housing", "What a real monthly budget looks like, and how renting and buying actually work."],
  ["Healthcare", "Public and private care, insurance, and what routine and emergency visits really cost."],
  ["Safety, schools & daily life", "An honest read on safety, raising kids, and what an ordinary day feels like."],
  ["Other countries to consider", "How San Miguel and Mexico compare to Portugal, Ecuador, Thailand, and more."],
];

export default function Ebook() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: "The Geography of Wealth",
    alternativeHeadline: "How Moving to Mexico Changes Your Money, Your Time, and Who You Get to Be",
    author: { "@type": "Organization", name: "Vamos San Miguel" },
    inLanguage: "en",
    about: ["Geographic arbitrage", "Moving to Mexico", "San Miguel de Allende", "Expat relocation"],
    url: "/ebook",
  };

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "#B4791F", margin: "0 0 8px" }}>
        The book
      </p>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(28px, 4.6vw, 42px)", lineHeight: 1.05, margin: "0 0 10px", letterSpacing: "-.01em" }}>
        The Geography of Wealth
      </h1>
      <p style={{ fontSize: 18, lineHeight: 1.4, color: "#0D1B36", fontStyle: "italic", margin: "0 0 22px", maxWidth: "40ch" }}>
        How moving to Mexico changes your money, your time, and who you get to be.
      </p>

      <p style={{ fontSize: 16.5, lineHeight: 1.65, color: "#3A3125", margin: "0 0 15px", maxWidth: "60ch" }}>
        It started at a kitchen table in California, with a tax return open on a laptop and a number that would not add up. We were earning well and still could not get ahead. The problem was not how much we made or how carefully we budgeted. It was where we lived.
      </p>
      <p style={{ fontSize: 16.5, lineHeight: 1.65, color: "#3A3125", margin: "0 0 26px", maxWidth: "60ch" }}>
        This is the book we wish we had read first. It is the full, practical version of the free Move Here guides on this site: the money, the taxes, the visas, the healthcare, the schools, and the honest tradeoffs of building a life somewhere new.
      </p>

      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, margin: "0 0 14px" }}>What is inside</h2>
      <div style={{ display: "grid", gap: 10, marginBottom: 30 }}>
        {INSIDE.map(([h, d]) => (
          <div key={h} style={{ background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 12, padding: "13px 15px" }}>
            <div style={{ fontWeight: 700, color: "#0D1B36", marginBottom: 3 }}>{h}</div>
            <div style={{ fontSize: 14, color: "#6E604F", lineHeight: 1.5 }}>{d}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#0D1B36", color: "#F7F3EC", borderRadius: 16, padding: "24px 22px" }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, margin: "0 0 8px", color: "#fff" }}>Coming soon</h2>
        <p style={{ margin: "0 0 16px", fontSize: 15.5, lineHeight: 1.6, opacity: .92 }}>
          The full book is in final edits. Meanwhile, everything you need to start is already free on this site.
        </p>
        <Link href="/move" style={{ display: "inline-block", background: "#E06A63", color: "#fff", fontWeight: 700, fontSize: 15, padding: "12px 20px", borderRadius: 11, textDecoration: "none" }}>
          Start with the free Move Here guides →
        </Link>
      </div>
    </PageShell>
  );
}
