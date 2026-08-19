import Link from "next/link";
import PageShell from "../../components/PageShell";
import { getBestOfCategories, dbToUrlSlug } from "../../lib/bestOf";

// Hub page linking every published best-of category. Fresh from the same data as the app.
export const revalidate = 1800;

const BASE = "https://vamossanmiguel.com";
const CITY = "San Miguel de Allende";

export const metadata = {
  title: `The Best of ${CITY}: restaurants, bars and more | Vamos San Miguel`,
  description: `Our local picks for the best restaurants, bars, brunch, tacos, mezcal and more in ${CITY}. One winner per craving, chosen by locals and never sponsored.`,
  alternates: { canonical: "/best" },
  openGraph: { title: `The Best of ${CITY}`, description: `Local picks for the best of ${CITY}, one winner per craving.`, type: "website", url: `${BASE}/best` },
};

export default async function BestOfHub() {
  const cats = (await getBestOfCategories()).filter((c) => c.winner);

  const listLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `The Best of ${CITY}`,
    url: `${BASE}/best`,
    hasPart: cats.map((c) => ({ "@type": "ItemList", name: `${c.label_en} in ${CITY}`, url: `${BASE}/best/${dbToUrlSlug(c.slug)}` })),
  };

  return (
    <PageShell active="picks">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }} />

      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 34, lineHeight: 1.1, margin: "0 0 10px", color: "#0D1B36" }}>
        The best of {CITY}
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.55, color: "#463A2C", margin: "0 0 6px" }}>
        One winner per craving, with a short list of runners-up worth knowing. Chosen by locals, never sponsored.
      </p>
      <p style={{ fontSize: 13.5, color: "#6E604F", margin: "0 0 28px" }}>{cats.length} categories and counting.</p>

      {cats.length === 0 ? (
        <p style={{ fontSize: 15, color: "#6E604F" }}>Picks are coming soon. Check back shortly.</p>
      ) : (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {cats.map((c) => {
            const w = c.winner;
            return (
              <Link key={c.slug} href={`/best/${dbToUrlSlug(c.slug)}`}
                style={{ display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit", background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 15, overflow: "hidden", boxShadow: "0 4px 16px rgba(13,20,40,.05)" }}>
                <div style={{ position: "relative" }}>
                  {w.photo_url
                    ? <img src={w.photo_url} alt="" loading="lazy" style={{ width: "100%", height: 150, objectFit: "cover", display: "block", background: "#EFE7D8" }} />
                    : <div style={{ height: 150, background: "linear-gradient(135deg, #E06A63, #F2A100)" }} />}
                  <span style={{ position: "absolute", top: 12, left: 12, display: "inline-flex", alignItems: "center", gap: 5, background: "#E06A63", color: "#fff", fontWeight: 800, fontSize: 12.5, letterSpacing: ".03em", textTransform: "uppercase", padding: "6px 13px", borderRadius: 999, boxShadow: "0 3px 12px rgba(13,20,40,.4)" }}>
                    ★ {c.label_en}
                  </span>
                </div>
                <div style={{ padding: "14px 16px 16px" }}>
                  <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, margin: "0 0 3px", color: "#0D1B36", lineHeight: 1.15 }}>{w.name}</h2>
                  {w.area && <p style={{ fontSize: 12, fontWeight: 600, color: "#B4791F", margin: 0, textTransform: "uppercase", letterSpacing: ".04em" }}>{w.area}</p>}
                  <span style={{ display: "inline-block", marginTop: 10, fontSize: 13.5, fontWeight: 700, color: "#E06A63" }}>See the pick →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
