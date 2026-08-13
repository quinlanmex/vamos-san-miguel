import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import Markdown from "../../../components/Markdown";
import { getPlanArticles, getPlanArticle } from "../../../lib/articles";

// Content comes from the DB (Google Docs sync); re-fetch every 5 min so edits
// appear without a redeploy.
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getPlanArticles()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const page = await getPlanArticle(params.slug);
  if (!page) return { title: "Not found | Vamos San Miguel" };
  return {
    title: `${page.title} | Vamos San Miguel`,
    description: page.description || undefined,
    alternates: { canonical: `/plan/${page.slug}` },
    openGraph: { title: page.title, description: page.description || undefined, type: "article" },
  };
}

function faqFrom(body) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const faqs = [];
  for (let i = 0; i < lines.length; i++) {
    const h = /^##\s+(.*\?)\s*$/.exec(lines[i]);
    if (!h) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    const ans = [];
    while (j < lines.length && lines[j].trim() && !/^#{1,6}\s/.test(lines[j]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[j])) { ans.push(lines[j].trim()); j++; }
    if (ans.length) faqs.push({ q: h[1], a: ans.join(" ").replace(/\*\*|\[|\]\([^)]*\)/g, "") });
  }
  return faqs;
}

export default async function PlanGuide({ params }) {
  const page = await getPlanArticle(params.slug);
  if (!page) notFound();
  const faqs = faqFrom(page.body);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.description || undefined,
    inLanguage: "en",
    author: { "@type": "Organization", name: "Vamos San Miguel" },
    publisher: { "@type": "Organization", name: "Vamos San Miguel" },
    mainEntityOfPage: `/plan/${page.slug}`,
  };
  const faqLd = faqs.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  } : null;

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <p style={{ fontSize: 13.5, margin: "0 0 18px", color: "#6E604F" }}>
        <Link href="/plan" style={{ color: "#0D1B36", textDecoration: "none", fontWeight: 600 }}>← Plan your trip</Link>
      </p>

      <article><Markdown body={page.body} /></article>

      <div style={{ marginTop: 34, padding: "16px 20px", background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 14 }}>
        <p style={{ margin: 0, fontSize: 14.5, color: "#6E604F", lineHeight: 1.5 }}>
          More trip planning in the <Link href="/plan" style={{ color: "#E06A63", fontWeight: 600, textDecoration: "none" }}>guides</Link>, or browse our <Link href="/" style={{ color: "#E06A63", fontWeight: 600, textDecoration: "none" }}>Local Picks and events</Link>.
        </p>
      </div>
    </PageShell>
  );
}
