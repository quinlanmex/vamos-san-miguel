import { getGoogleToken } from "./google";

// Google Search Console read layer for the automated SEO monitor. Reuses the Docs-sync service
// account (needs the SA added as a user on the GSC property + the Search Console API enabled).
// The property is a DOMAIN property, whose API siteUrl is "sc-domain:<domain>", not a URL.

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const SITE = "sc-domain:vamossanmiguel.com";
const SITE_ENC = encodeURIComponent(SITE);
const SITEMAP = "https://www.vamossanmiguel.com/sitemap.xml";

// Pages we care most about — inspected each run for unexpected regressions (noindex, robots
// block, canonical mismatch, dropped from index).
const KEY_URLS = [
  "https://www.vamossanmiguel.com/",
  "https://www.vamossanmiguel.com/whats-on",
  "https://www.vamossanmiguel.com/best",
  "https://www.vamossanmiguel.com/plan",
  "https://www.vamossanmiguel.com/plan/things-to-do-in-san-miguel-de-allende",
  "https://www.vamossanmiguel.com/guide",
];

const ymd = (d) => d.toISOString().slice(0, 10);

async function api(url, token, init = {}) {
  const res = await fetch(url, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) } });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error?.message || `${res.status} ${res.statusText}`);
  return j;
}

// Search performance for the last `days` days, grouped by `dimensions` (e.g. ["query"]).
async function searchAnalytics(token, { days = 28, dimensions = [], rowLimit = 25 } = {}) {
  const end = new Date();
  const start = new Date(Date.now() - days * 864e5);
  return api(`https://www.googleapis.com/webmasters/v3/sites/${SITE_ENC}/searchAnalytics/query`, token, {
    method: "POST",
    body: JSON.stringify({ startDate: ymd(start), endDate: ymd(end), dimensions, rowLimit }),
  });
}

async function sitemapStatus(token) {
  return api(`https://www.googleapis.com/webmasters/v3/sites/${SITE_ENC}/sitemaps/${encodeURIComponent(SITEMAP)}`, token);
}

async function inspectUrl(token, inspectionUrl) {
  const j = await api("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", token, {
    method: "POST",
    body: JSON.stringify({ inspectionUrl, siteUrl: SITE, languageCode: "en-US" }),
  });
  const r = j.inspectionResult?.indexStatusResult || {};
  return {
    url: inspectionUrl,
    verdict: r.verdict, coverageState: r.coverageState,
    robotsTxtState: r.robotsTxtState, indexingState: r.indexingState,
    googleCanonical: r.googleCanonical, userCanonical: r.userCanonical,
    lastCrawlTime: r.lastCrawlTime,
  };
}

// Assemble a compact health report + a list of issues, tagged auto-fixable (technical, code can
// fix) vs. needs-human (content/indexing judgement). Every section is best-effort.
export async function gscHealthReport() {
  const token = await getGoogleToken(SCOPE); // throws if SA/env not set up
  const report = { site: SITE, generatedAt: new Date().toISOString(), issues: [] };
  const add = (severity, autofixable, message) => report.issues.push({ severity, autofixable, message });

  // Performance (28d): totals + top queries + top pages.
  try {
    const [totals, byQuery, byPage] = await Promise.all([
      searchAnalytics(token, { dimensions: [] }),
      searchAnalytics(token, { dimensions: ["query"], rowLimit: 15 }),
      searchAnalytics(token, { dimensions: ["page"], rowLimit: 15 }),
    ]);
    const t = totals.rows?.[0] || {};
    report.performance = {
      clicks: t.clicks || 0, impressions: t.impressions || 0,
      ctr: t.ctr || 0, position: t.position || null,
      topQueries: (byQuery.rows || []).map((r) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: Math.round(r.position * 10) / 10 })),
      topPages: (byPage.rows || []).map((r) => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
    };
  } catch (e) { report.performance = { error: e.message }; }

  // Sitemap health.
  try {
    const sm = await sitemapStatus(token);
    report.sitemap = { lastDownloaded: sm.lastDownloaded, isPending: sm.isPending, errors: sm.errors || 0, warnings: sm.warnings || 0, contents: sm.contents || [] };
    if (Number(sm.errors) > 0) add("high", true, `Sitemap reports ${sm.errors} error(s) — check ${SITEMAP}`);
  } catch (e) { report.sitemap = { error: e.message }; }

  // Key-URL index status — where technical regressions show up.
  try {
    const inspected = [];
    for (const u of KEY_URLS) {
      try { inspected.push(await inspectUrl(token, u)); } catch (e) { inspected.push({ url: u, error: e.message }); }
    }
    report.keyUrls = inspected;
    for (const r of inspected) {
      if (r.error) continue;
      if (r.robotsTxtState === "DISALLOWED") add("high", true, `${r.url} is blocked by robots.txt`);
      if (r.indexingState === "BLOCKED_BY_META_TAG") add("high", true, `${r.url} has a noindex meta tag`);
      if (r.userCanonical && r.googleCanonical && r.userCanonical !== r.googleCanonical) add("medium", true, `${r.url}: Google chose a different canonical (${r.googleCanonical})`);
      if (r.verdict === "PASS" && r.coverageState && !/^Submitted and indexed|^Indexed/.test(r.coverageState)) add("low", false, `${r.url}: ${r.coverageState}`);
    }
  } catch (e) { report.keyUrls = { error: e.message }; }

  return report;
}
