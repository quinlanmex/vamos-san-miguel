import fs from "fs";
import path from "path";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

// One-time (idempotent) seed: load the markdown guides in content/plan into the
// articles table so they can be edited via Google Docs sync afterward. Only fills
// body_md/title/description when the row is new or still file-sourced; never clobbers
// a row that already has a google_doc_id (that content now comes from the Doc).

const PLAN_ORDER = [
  "things-to-do-in-san-miguel-de-allende",
  "where-to-eat-in-san-miguel-de-allende",
  "where-to-stay-in-san-miguel-de-allende",
  "3-days-in-san-miguel-de-allende",
  "best-day-trips-from-san-miguel-de-allende",
  "getting-to-and-around-san-miguel-de-allende",
];

function parseFrontmatter(raw) {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(raw);
  if (!m) return { data: {}, body: raw.trim() };
  const data = {};
  for (const line of m[1].split("\n")) {
    const mm = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line.trim());
    if (!mm) continue;
    data[mm[1]] = mm[2].trim().replace(/^["']|["']$/g, "");
  }
  return { data, body: m[2].trim() };
}

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let sb;
  try { sb = supabaseAdmin(); } catch (e) { return Response.json({ error: String(e.message || e) }, { status: 500 }); }

  const dir = path.join(process.cwd(), "content/plan");
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")); }
  catch (e) { return Response.json({ error: "content/plan not found: " + String(e.message || e) }, { status: 500 }); }

  // Rows that already sync from a Doc must not be reset back to file content.
  const { data: existing } = await sb.from("articles").select("slug,google_doc_id").eq("kind", "plan");
  const linked = new Set((existing || []).filter((r) => r.google_doc_id).map((r) => r.slug));

  let seeded = 0, skipped = 0, error = null;
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    if (linked.has(slug)) { skipped++; continue; } // Doc-backed already — leave it alone
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { data, body } = parseFrontmatter(raw);
    const sort = PLAN_ORDER.indexOf(slug) === -1 ? 100 : PLAN_ORDER.indexOf(slug);
    const { error: e } = await sb.from("articles").upsert(
      { kind: "plan", slug, title: data.title || slug, description: data.description || null, body_md: body, sort },
      { onConflict: "kind,slug" },
    );
    if (e) { error = e.message; break; }
    seeded++;
  }

  return Response.json({ ok: !error, seeded, skipped, total: files.length, error }, { status: error ? 500 : 200 });
}
