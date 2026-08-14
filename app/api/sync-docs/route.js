import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { getGoogleToken, docToMarkdown } from "../../../lib/google";

export const runtime = "nodejs";
export const maxDuration = 120;

// Google Docs -> website sync. Each articles row can point at a Google Doc via
// google_doc_id; this pulls each mapped Doc, converts it to markdown, and writes
// it to body_md. Runs on a daily cron and on-demand from the admin page.
export async function run() {
  const sb = supabaseAdmin();
  const { data: rows, error } = await sb
    .from("articles")
    .select("id,slug,google_doc_id")
    .not("google_doc_id", "is", null);
  if (error) return { ok: false, error: error.message, status: 500 };
  const mapped = (rows || []).filter((r) => r.google_doc_id && r.google_doc_id.trim());
  if (!mapped.length) return { ok: true, synced: 0, note: "No articles have a google_doc_id yet." };

  let token;
  try { token = await getGoogleToken("https://www.googleapis.com/auth/documents.readonly"); }
  catch (e) { return { ok: false, error: String(e.message || e), status: 500 }; }

  let synced = 0;
  const failures = [];
  for (const r of mapped) {
    try {
      const docId = r.google_doc_id.trim();
      const res = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { failures.push(`${r.slug}: Doc fetch ${res.status} (shared with the service account?)`); continue; }
      const doc = await res.json();
      const md = docToMarkdown(doc);
      if (!md.trim()) { failures.push(`${r.slug}: Doc is empty`); continue; }
      const { error: e } = await sb.from("articles").update({ body_md: md, synced_at: new Date().toISOString() }).eq("id", r.id);
      if (e) { failures.push(`${r.slug}: DB write ${e.message}`); continue; }
      synced++;
    } catch (e) {
      failures.push(`${r.slug}: ${String(e.message || e)}`);
    }
  }
  return { ok: failures.length === 0, synced, mapped: mapped.length, failures };
}

// Scheduled (Vercel cron) — protected by x-vercel-cron or a token.
export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  const secret = process.env.CRON_SECRET;
  const isCron = req.headers.get("x-vercel-cron") === "1";
  if (!isCron && !(secret && token === secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.status || (r.ok ? 200 : 500) });
}

// Manual trigger from admin.
export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.status || (r.ok ? 200 : 500) });
}
