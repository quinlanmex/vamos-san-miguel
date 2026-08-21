import { getMovePages, getPlanPages } from "../lib/content";
import { getBestOfCategories, dbToUrlSlug } from "../lib/bestOf";

const BASE = "https://vamossanmiguel.com";

export default async function sitemap() {
  const now = new Date();
  const staticPages = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/whats-on`, changeFrequency: "daily", priority: 0.95 },
    { url: `${BASE}/best`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/plan`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/move`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/ebook`, changeFrequency: "monthly", priority: 0.6 },
  ];
  const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const whatsOnMonths = Array.from({ length: 4 }, (_, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { url: `${BASE}/whats-on/${MONTHS[dt.getMonth()]}-${dt.getFullYear()}`, changeFrequency: "daily", priority: 0.8 };
  });
  const plan = getPlanPages().map((p) => ({ url: `${BASE}/plan/${p.slug}`, changeFrequency: "monthly", priority: 0.8 }));
  const move = getMovePages().map((p) => ({ url: `${BASE}/move/${p.slug}`, changeFrequency: "monthly", priority: 0.8 }));
  let best = [];
  try {
    best = (await getBestOfCategories())
      .filter((c) => c.winner)
      .map((c) => ({ url: `${BASE}/best/${dbToUrlSlug(c.slug)}`, changeFrequency: "weekly", priority: 0.85 }));
  } catch {}
  return [...staticPages, ...whatsOnMonths, ...plan, ...move, ...best].map((e) => ({ lastModified: now, ...e }));
}
