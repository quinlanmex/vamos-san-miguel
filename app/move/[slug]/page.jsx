import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import Markdown from "../../../components/Markdown";
import { getMovePages, getMovePage } from "../../../lib/content";

export function generateStaticParams() {
  return getMovePages().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
  const page = getMovePage(params.slug);
  if (!page) return { title: "Not found | Vamos San Miguel" };
  return {
    title: `${page.title} | Vamos San Miguel`,
    description: page.description || undefined,
    alternates: { canonical: `/move/${page.slug}` },
    openGraph: { title: page.title, description: page.description || undefined, type: "article" },
  };
}

// Pull FAQ pairs from question-style "## ...?" headings and the paragraph beneath.
function faqFrom(body) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const faqs = [];
  for (let i = 0; i < lines.length; i++) {
    const h = /^##\s+(.*\?)\s*$/.exec(lines[i]);
    if (!h) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    const ans = [];
    while (j < lines.length && lines[j].trim() && !/^#{1,6}\s/.test(lines[j]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[j])) {
      ans.push(lines[j].trim()); j++;
    }
    if (ans.length) faqs.push({ q: h[1], a: ans.join(" ").replace(/\*\*|\[|\]\([^)]*\)/g, "") });
  }
  return faqs;
}

export default function MoveGuide({ params }) {
  const page = getMovePage(params.slug);
  if (!page) notFound();

  // Weaving: spokes declare a `parent` pillar slug. A pillar surfaces its children;
  // a spoke links back up to its pillar.
  const related = getMovePages().filter((p) => p.parent === page.slug && p.slug !== page.slug);
  const parent = page.parent ? getMovePage(page.parent) : null;

  // Body already starts with an H1; render it all through the markdown component.
  const faqs = faqFrom(page.body);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.description || undefined,
    inLanguage: "en",
    author: { "@type": "Organization", name: "Vamos San Miguel" },
    publisher: { "@type": "Organization", name: "Vamos San Miguel" },
    mainEntityOfPage: `/move/${page.slug}`,
  };
  const faqLd = faqs.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  } : null;

  return (
    <PageShell active="move">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <p style={{ fontSize: 13.5, margin: "0 0 18px", color: "#6E604F" }}>
        <Link href="/move" style={{ color: "#0D1B36", textDecoration: "none", fontWeight: 600 }}>← Move Here</Link>
        {parent && <> · <Link href={`/move/${parent.slug}`} style={{ color: "#0D1B36", textDecoration: "none", fontWeight: 600 }}>{parent.title}</Link></>}
      </p>

      <article>
        <Markdown body={page.body} />
      </article>

      {/* Related deep-dive guides (pillar -> spokes) */}
      {related.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#B4791F", margin: "0 0 10px" }}>
            Go deeper
          </p>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {related.map((r) => (
              <Link key={r.slug} href={`/move/${r.slug}`}
                style={{ display: "block", textDecoration: "none", color: "inherit", background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 14, padding: "15px 16px" }}>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, margin: "0 0 5px", lineHeight: 1.2, color: "#0D1B36" }}>{r.title}</h3>
                {r.description && <p style={{ fontSize: 13, lineHeight: 1.5, color: "#6E604F", margin: 0 }}>{r.description}</p>}
                <span style={{ display: "inline-block", marginTop: 9, fontSize: 13, fontWeight: 700, color: "#E06A63" }}>Read →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 34, padding: "20px 22px", background: "#0D1B36", color: "#F7F3EC", borderRadius: 16 }}>
        <p style={{ margin: "0 0 6px", fontFamily: "Georgia, serif", fontSize: 19, color: "#fff" }}>Adapted from the book</p>
        <p style={{ margin: "0 0 14px", fontSize: 14.5, lineHeight: 1.55, opacity: .92 }}>
          This guide is drawn from <em>The Geography of Wealth</em>, our full playbook on the money, the moves, and the life on the other side.
        </p>
        <Link href="/ebook" style={{ display: "inline-block", background: "#E06A63", color: "#fff", fontWeight: 700, fontSize: 14.5, padding: "10px 18px", borderRadius: 11, textDecoration: "none" }}>
          About the book →
        </Link>
      </div>

      <div style={{ marginTop: 16, padding: "16px 20px", background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 14 }}>
        <p style={{ margin: 0, fontSize: 14.5, color: "#6E604F", lineHeight: 1.5 }}>
          Browse the rest of the <Link href="/move" style={{ color: "#E06A63", fontWeight: 600, textDecoration: "none" }}>moving guides</Link>, or see the <Link href="/" style={{ color: "#E06A63", fontWeight: 600, textDecoration: "none" }}>Local Picks and events</Link> that make San Miguel feel like home.
        </p>
      </div>
    </PageShell>
  );
}
