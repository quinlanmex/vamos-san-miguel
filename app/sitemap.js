import { getMovePages, getPlanPages } from "../lib/content";

const BASE = "https://vamossanmiguel.com";

export default function sitemap() {
  const now = new Date();
  const staticPages = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/plan`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/move`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/ebook`, changeFrequency: "monthly", priority: 0.6 },
  ];
  const plan = getPlanPages().map((p) => ({ url: `${BASE}/plan/${p.slug}`, changeFrequency: "monthly", priority: 0.8 }));
  const move = getMovePages().map((p) => ({ url: `${BASE}/move/${p.slug}`, changeFrequency: "monthly", priority: 0.8 }));
  return [...staticPages, ...plan, ...move].map((e) => ({ lastModified: now, ...e }));
}
