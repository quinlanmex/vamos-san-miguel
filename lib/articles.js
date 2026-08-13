import { getPlanPages as filePlanPages, getPlanPage as filePlanPage } from "./content";
import { supabaseAdmin } from "./supabaseAdmin";

// DB-backed article reader with a markdown-file fallback.
//
// Content lives in the Supabase `articles` table (editable via Google Docs sync).
// If the table is missing, empty, or the query fails for any reason, we fall back
// to the committed markdown in content/plan so the site never goes blank. Pages
// that use this set `revalidate` so Doc edits appear without a redeploy.

async function dbPlanArticles() {
  let sb;
  try { sb = supabaseAdmin(); } catch { return null; }
  const { data, error } = await sb
    .from("articles")
    .select("slug,title,description,body_md,sort")
    .eq("kind", "plan")
    .order("sort", { ascending: true });
  if (error || !data || !data.length) return null; // fall back to files
  return data.map((r) => ({
    slug: r.slug,
    title: r.title || r.slug,
    description: r.description || "",
    body: r.body_md || "",
  }));
}

export async function getPlanArticles() {
  const db = await dbPlanArticles();
  if (db) return db;
  return filePlanPages();
}

export async function getPlanArticle(slug) {
  const db = await dbPlanArticles();
  if (db) return db.find((p) => p.slug === slug) || null;
  return filePlanPage(slug);
}
