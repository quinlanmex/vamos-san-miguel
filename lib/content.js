import fs from "fs";
import path from "path";

// Server-only helpers to read the markdown guides under content/*.
// These run in server components / at build time (Node runtime), never in the browser.

const ROOT = process.cwd();

/* Minimal YAML-frontmatter parser for our own controlled files.
 * Supports: key: value, and key: [a, b, c] list values. */
function parseFrontmatter(raw) {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(raw);
  if (!m) return { data: {}, body: raw.trim() };
  const data = {};
  for (const line of m[1].split("\n")) {
    const mm = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line.trim());
    if (!mm) continue;
    let v = mm[2].trim();
    if (v.startsWith("[") && v.endsWith("]")) {
      v = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    } else {
      v = v.replace(/^["']|["']$/g, "");
    }
    data[mm[1]] = v;
  }
  return { data, body: m[2].trim() };
}

function readDir(dir) {
  const full = path.join(ROOT, dir);
  let files = [];
  try { files = fs.readdirSync(full).filter((f) => f.endsWith(".md")); } catch { return []; }
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(full, file), "utf8");
    const { data, body } = parseFrontmatter(raw);
    return { slug: file.replace(/\.md$/, ""), body, ...data };
  });
}

// Preferred display order for the Move Here hub; anything not listed sorts after, alphabetically.
const MOVE_ORDER = [
  "money-case", "taxes-and-the-feie", "visas-residency", "cost-of-living",
  "housing", "healthcare", "safety", "raising-kids", "life-in-san-miguel", "is-it-worth-it",
];

export function getMovePages() {
  const pages = readDir("content/move");
  return pages.sort((a, b) => {
    const ia = MOVE_ORDER.indexOf(a.slug), ib = MOVE_ORDER.indexOf(b.slug);
    if (ia === -1 && ib === -1) return a.slug.localeCompare(b.slug);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function getMovePage(slug) {
  return getMovePages().find((p) => p.slug === slug) || null;
}

// Visitor "Plan your trip" pages.
const PLAN_ORDER = [
  "things-to-do-in-san-miguel-de-allende",
  "where-to-eat-in-san-miguel-de-allende",
  "where-to-stay-in-san-miguel-de-allende",
  "3-days-in-san-miguel-de-allende",
  "best-day-trips-from-san-miguel-de-allende",
  "getting-to-and-around-san-miguel-de-allende",
];

export function getPlanPages() {
  const pages = readDir("content/plan");
  return pages.sort((a, b) => {
    const ia = PLAN_ORDER.indexOf(a.slug), ib = PLAN_ORDER.indexOf(b.slug);
    if (ia === -1 && ib === -1) return a.slug.localeCompare(b.slug);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function getPlanPage(slug) {
  return getPlanPages().find((p) => p.slug === slug) || null;
}
