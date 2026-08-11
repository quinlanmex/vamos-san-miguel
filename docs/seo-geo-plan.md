# Vamos San Miguel — SEO + GEO Publishing Plan

Goal: rank in Google **and** get surfaced/cited by AI assistants (GEO = Generative Engine Optimization). The keyword targets live in `docs/keyword-map.md`; this doc is the technical architecture and rollout.

## The core problem to fix first

The site currently renders client-side only (`app/page.jsx` does `dynamic(() => import("./App"), { ssr: false })`). That means crawlers and AI agents see an almost-empty HTML shell. **Nothing we do downstream matters until the content is server-rendered as real HTML.** This is Phase A, and it is the gate.

## URL architecture (indexable, one page per thing)

Every event, pick, and article needs its own canonical URL. Proposed structure:

| Path | Content | Schema |
| --- | --- | --- |
| `/` | Home / browse (server-rendered summary + links) | WebSite, Organization |
| `/events/[slug]` | One event | `Event` |
| `/picks/[slug]` | One Local Pick (business/venue) | `LocalBusiness` (+ `Restaurant`/`BarOrPub` subtype) |
| `/plan/[slug]` | Visitor guides (itineraries, where to stay, getting around) | `Article` + `FAQPage` |
| `/move/[slug]` | Book-derived relocation pillars (visas, cost of living, healthcare…) | `Article` + `FAQPage` |
| `/es/...` | Spanish mirror of every route | same + `inLanguage: es-MX` |

Slugs: human-readable, keyword-bearing, stable (e.g. `/picks/cafe-1910`, `/move/mexico-temporary-resident-visa`).

## Phase A — Technical foundation (the gate)

1. **Server-render content.** Move the browse/list and every detail page to server components (or `generateStaticParams` + server fetch from Supabase). Keep the interactive bits (map toggle, filters, saves) as client islands (`"use client"`) inside a server-rendered shell. The map (Leaflet) stays `ssr:false`; the *content* must not.
2. **Metadata per route** via Next `generateMetadata`: title + description templates, `canonical`, OpenGraph + Twitter, and `alternates.languages` for hreflang (en ↔ es-MX, reciprocal).
3. **`app/sitemap.js`** — dynamic sitemap from the DB: home, all published events, all picks, all articles, with `lastModified`. Split if it grows past ~50k URLs.
4. **`app/robots.js`** — allow indexing; point to the sitemap; explicitly allow the good AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) while we keep abusive scrapers rate-limited at the edge (see Anti-scraping).
5. **`public/llms.txt`** — a machine-readable index of what the site offers, in plain markdown, so LLM crawlers can parse the offering and cite it. List the main sections + canonical URLs + a one-line description each.

## Phase B — Structured data (schema.org JSON-LD)

Emit JSON-LD in each page's server HTML. This is the single biggest lever for both rich results and AI citation, because it states facts unambiguously.

- **Events** → `Event` (name, startDate, endDate, location `Place` with address + geo, offers/price, image, description, organizer).
- **Picks** → `LocalBusiness` + specific subtype (`Restaurant`, `BarOrPub`, `ArtGallery`), with `name`, `address` (PostalAddress), `geo` (lat/lng from the Places import), `image`, `priceRange`, `servesCuisine`, `url`.
- **Articles** (plan + move) → `Article` with `headline`, `datePublished`, `dateModified`, `author` (Organization "Vamos San Miguel"), plus a `FAQPage` block built from the question-style H2s.
- **Site-wide** → `Organization` + `WebSite` (with `SearchAction` if we add search), `BreadcrumbList` on every detail page.

Validate everything with Google's Rich Results Test + schema.org validator before shipping.

## Phase C — GEO specifics (get cited by AI, not just ranked)

AI assistants extract and cite content that is factual, well-structured, and unambiguous:

- **Answer-first structure.** Lead each article with a 2–3 sentence direct answer, then detail. AI models lift the concise answer.
- **Question-style headings.** `## How much does the temporary resident visa cost?` beats `## Costs`. Mirror real queries from the keyword map.
- **FAQ blocks** with `FAQPage` schema on every guide and pillar.
- **Entity clarity.** Every pick states its real name + full address + coordinates (we have these from the Places import), so an assistant can answer "where is X" precisely.
- **Cite-ability.** Original photos, named authorship ("edited by Jeff & family"), and the "we never take money for a pick" trust line — AI models weight source trust.
- **Freshness.** `dateModified` + sitemap `lastmod`; a visible "Updated {date}" on time-sensitive pages.
- **The book pillars are the GEO goldmine.** "Move to Mexico" queries are exactly what people ask assistants; the cited, structured chapters are built to be the answer.

## Phase D — Bilingual (en default, es-MX)

- Every route mirrored under `/es/`. Reciprocal `hreflang` alternates (`en`, `es-MX`, `x-default`).
- Don't auto-translate and forget — the top pages get the native-Spanish reviewer pass (per the strategy).
- Spanish slugs in Spanish (`/es/picks/...` with localized article slugs where it helps).

## Anti-scraping vs. AI-friendly (deliberate balance)

We *want* AI crawlers (that's GEO); we *don't* want competitors bulk-scraping the picks. Balance:
- **Allow** GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot in robots.
- **Rate-limit / block** abusive patterns at the edge (Vercel middleware / WAF): high-frequency IPs, missing/forged UAs, datacenter ranges hammering the JSON endpoints.
- Keep the raw Supabase read behind sensible RLS + a thin API, not a wide-open dump.
- Watermark value in *curation + original media + voice* (hard to scrape meaningfully), not in raw listings.

## Measurement

- Google Search Console + Bing Webmaster Tools (submit sitemap, watch coverage + queries).
- Rich Results Test / schema validator in CI or pre-ship.
- Periodically ask the major assistants SMA questions and see whether we're cited; track over time.
- Core Web Vitals (server-render + image optimization should keep these green).

## Rollout order (recommended)

1. **Phase A** (server-render + metadata + sitemap + robots + llms.txt) — nothing ranks without it.
2. **Phase B** (schema on events + picks) — fast wins once pages are server-rendered.
3. **Phase C** book pillars as `/move/*` articles with FAQ schema — the highest-value, highest-intent traffic.
4. **Phase D** Spanish mirror + hreflang.
5. Ongoing: measurement + freshness.

Dependencies: Phase A/B need the picks + events actually in the DB with coordinates (the Places import). So: **import picks → then server-render + schema.** The import unblocks the SEO work.
