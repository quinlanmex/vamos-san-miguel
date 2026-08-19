import { getMovePages, getPlanPages } from "../lib/content";
import { getBestOfCategories, dbToUrlSlug } from "../lib/bestOf";

const BASE = "https://vamossanmiguel.com";

export default async function sitemap() {
  const now = new Date();
  const staticPages = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/best`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/plan`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/move`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/ebook`, changeFrequency: "monthly", priority: 0.6 },
  ];
  const plan = getPlanPages().map((p) => ({ url: `${BASE}/plan/${p.slug}`, changeFrequency: "monthly", priority: 0.8 }));
  const move = getMovePages().map((p) => ({ url: `${BASE}/move/${p.slug}`, changeFrequency: "monthly", priority: 0.8 }));
  let best = [];
  try {
    best = (await getBestOfCategories())
      .filter((c) => c.winner)
      .map((c) => ({ url: `${BASE}/best/${dbToUrlSlug(c.slug)}`, changeFrequency: "weekly", priority: 0.85 }));
  } catch {}
  return [...staticPages, ...plan, ...move, ...best].map((e) => ({ lastModified: now, ...e }));
}
