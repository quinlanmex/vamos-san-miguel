import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { getBestOfCategories, getBestOfBySlug, dbToUrlSlug, urlToDbSlug } from "../../../lib/bestOf";

// Server-rendered "Best [thing] in San Miguel de Allende" pages. One indexable page per
// published best-of category, driven straight from the same data the app rails use, so a
// new category (or a changed winner) shows up here automatically. Revalidated, not static.
export const revalidate = 1800;

const BASE = "https://vamossanmiguel.com";
const CITY = "San Miguel de Allende";

export async function generateStaticParams() {
  const cats = await getBestOfCategories();
  return cats.map((c) => ({ slug: dbToUrlSlug(c.slug) }));
}

export async function generateMetadata({ params }) {
  const cat = await getBestOfBySlug(urlToDbSlug(params.slug));
  if (!cat || !cat.winner) return { title: "Not found | Vamos San Miguel" };
  const title = `${cat.label_en} in ${CITY} (2026)`;
  const description = (cat.blurb_en
    || `Our pick for ${cat.label_en.toLowerCase()} in ${CITY}: ${cat.winner.name}${cat.runners.length ? `, plus ${cat.runners.length} more worth knowing.` : "."}`).slice(0, 300);
  const url = `/best/${dbToUrlSlug(cat.slug)}`;
  return {
    title: `${title} | Vamos San Miguel`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title, description, type: "article", url: `${BASE}${url}`,
      images: cat.winner.photo_url ? [{ url: cat.winner.photo_url }] : undefined,
    },
    twitter: { card: cat.winner.photo_url ? "summary_large_image" : "summary", title, description },
  };
}

// Loose schema.org type per list_key so search engines read the right kind of place.
const schemaType = (place) =>
  place.list_key === "bar" ? "BarOrPub" : place.list_key === "rest" ? "Restaurant" : "LocalBusiness";

const placeLd = (place) => ({
  "@type": schemaType(place),
  name: place.name,
  address: { "@type": "PostalAddress", addressLocality: CITY, addressRegion: "Guanajuato", addressCountry: "MX" },
  ...(place.lat && place.lng ? { geo: { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lng } } : {}),
  ...(place.photo_url ? { image: place.photo_url } : {}),
  ...(place.area ? { areaServed: place.area } : {}),
});

const mapsHref = (p) =>
  p.lat && p.lng
    ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ", " + CITY)}`;

export default async function BestOfPage({ params }) {
  const [cat, all] = await Promise.all([
    getBestOfBySlug(urlToDbSlug(params.slug)),
    getBestOfCategories(),
  ]);
  if (!cat || !cat.winner) notFound();

  const w = cat.winner;
  const urlSlug = dbToUrlSlug(cat.slug);
  const others = all.filter((c) => c.winner && c.slug !== cat.slug);
  const blurb = cat.blurb_en || "";
  const winnerTake = (w.local_take || w.desc_en || "").trim();

  const items = [w, ...cat.runners];
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cat.label_en} in ${CITY}`,
    ...(blurb ? { description: blurb } : {}),
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: items.length,
    itemListElement: items.map((p, i) => ({
      "@type": "ListItem", position: i + 1, item: placeLd(p),
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Best of", item: `${BASE}/best` },
      { "@type": "ListItem", position: 3, name: cat.label_en, item: `${BASE}/best/${urlSlug}` },
    ],
  };

  return (
    <PageShell active="picks">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <p style={{ fontSize: 13.5, margin: "0 0 16px", color: "#6E604F" }}>
        <Link href="/best" style={{ color: "#0D1B36", textDecoration: "none", fontWeight: 600 }}>← All best-of picks</Link>
      </p>

      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 34, lineHeight: 1.1, margin: "0 0 10px", color: "#0D1B36" }}>
        {cat.label_en} in {CITY}
      </h1>
      {blurb && <p style={{ fontSize: 17, lineHeight: 1.55, color: "#463A2C", margin: "0 0 8px" }}>{blurb}</p>}
      <p style={{ fontSize: 13.5, color: "#6E604F", margin: "0 0 26px" }}>Chosen by locals, never sponsored.</p>

      {/* Winner */}
      <article style={{ background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 18, overflow: "hidden", boxShadow: "0 6px 24px rgba(13,20,40,.06)" }}>
        {w.photo_url && (
          <div style={{ position: "relative" }}>
            <img src={w.photo_url} alt={w.name} style={{ width: "100%", height: 300, objectFit: "cover", display: "block", background: "#EFE7D8" }} />
            <span style={{ position: "absolute", top: 16, left: 16, display: "inline-flex", alignItems: "center", gap: 6, background: "#E06A63", color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: ".04em", textTransform: "uppercase", padding: "7px 15px", borderRadius: 999, boxShadow: "0 3px 14px rgba(13,20,40,.4)" }}>
              ★ Our pick
            </span>
          </div>
        )}
        <div style={{ padding: "22px 24px 24px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 27, margin: "0 0 4px", color: "#0D1B36", lineHeight: 1.12 }}>{w.name}</h2>
          {w.area && <p style={{ fontSize: 13.5, fontWeight: 600, color: "#B4791F", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: ".04em" }}>{w.area}</p>}
          {winnerTake && <p style={{ fontSize: 15.5, lineHeight: 1.62, color: "#3A3226", margin: "0 0 18px" }}>{winnerTake}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href={`/?place=${encodeURIComponent(w.name)}`}
              style={{ display: "inline-block", background: "#E06A63", color: "#fff", fontWeight: 700, fontSize: 14.5, padding: "11px 20px", borderRadius: 11, textDecoration: "none" }}>
              Open in the app →
            </Link>
            <a href={mapsHref(w)} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", background: "#F1EADD", color: "#0D1B36", fontWeight: 700, fontSize: 14.5, padding: "11px 20px", borderRadius: 11, textDecoration: "none", border: "1px solid #E1D6C1" }}>
              View on map
            </a>
          </div>
        </div>
      </article>

      {/* Runners-up */}
      {cat.runners.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#B4791F", margin: "0 0 12px" }}>
            Also great
          </p>
          <div style={{ display: "grid", gap: 14 }}>
            {cat.runners.map((r) => {
              const take = (r.local_take || r.desc_en || "").trim();
              return (
                <div key={r.id} style={{ display: "flex", gap: 14, background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 14, padding: 14 }}>
                  {r.photo_url
                    ? <img src={r.photo_url} alt={r.name} style={{ width: 92, height: 92, borderRadius: 10, objectFit: "cover", flexShrink: 0, background: "#EFE7D8" }} />
                    : <span style={{ width: 92, height: 92, borderRadius: 10, background: "#EFE7D8", flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontFamily: "Georgia, serif", fontSize: 19, margin: "0 0 2px", color: "#0D1B36", lineHeight: 1.15 }}>{r.name}</h3>
                    {r.area && <p style={{ fontSize: 12, fontWeight: 600, color: "#B4791F", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".04em" }}>{r.area}</p>}
                    {take && <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#5A4F40", margin: 0 }}>{take.slice(0, 180)}</p>}
                    <Link href={`/?place=${encodeURIComponent(r.name)}`} style={{ display: "inline-block", marginTop: 8, fontSize: 13, fontWeight: 700, color: "#E06A63", textDecoration: "none" }}>Open in the app →</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Explore other categories */}
      {others.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, margin: "0 0 14px", color: "#0D1B36" }}>More best-of picks</h2>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {others.map((c) => (
              <Link key={c.slug} href={`/best/${dbToUrlSlug(c.slug)}`}
                style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: "inherit", background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 13, padding: 11 }}>
                {c.winner.photo_url
                  ? <img src={c.winner.photo_url} alt="" loading="lazy" style={{ width: 46, height: 46, borderRadius: 9, objectFit: "cover", flexShrink: 0, background: "#EFE7D8" }} />
                  : <span style={{ width: 46, height: 46, borderRadius: 9, background: "#EFE7D8", flexShrink: 0 }} />}
                <span style={{ fontFamily: "Georgia, serif", fontSize: 15.5, fontWeight: 700, color: "#0D1B36", lineHeight: 1.15 }}>{c.label_en}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 34, padding: "20px 22px", background: "#0D1B36", color: "#F7F3EC", borderRadius: 16 }}>
        <p style={{ margin: "0 0 6px", fontFamily: "Georgia, serif", fontSize: 19, color: "#fff" }}>Plan the whole day</p>
        <p style={{ margin: "0 0 14px", fontSize: 14.5, lineHeight: 1.55, opacity: .92 }}>
          Save the spots you like and let our planner build a San Miguel day around them, walking distances and all.
        </p>
        <Link href="/?planner=1" style={{ display: "inline-block", background: "#E06A63", color: "#fff", fontWeight: 700, fontSize: 14.5, padding: "10px 18px", borderRadius: 11, textDecoration: "none" }}>
          ✨ Plan my trip →
        </Link>
      </div>
    </PageShell>
  );
}
