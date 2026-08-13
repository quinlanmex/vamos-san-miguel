import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { getGoogleToken, markdownToDocsRequests } from "../../../lib/google";

export const runtime = "nodejs";
export const maxDuration = 120;

// One-click Doc provisioning: for each article without a google_doc_id, create a
// Google Doc in the shared drive, fill it with the current body_md (formatted with
// real headings/bold/lists), and store the Doc id back on the row. Because the Doc
// lives in a shared drive the user already belongs to, no per-file sharing is
// needed. After this, the user just edits the Doc and /api/sync-docs pulls it back.
//
// Setup owed once: enable the Google Drive API, create a shared drive, add the
// service account as a member, and put the shared drive's ID in GOOGLE_SHARED_DRIVE_ID.

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents";

async function run(onlySlug) {
  const driveId = process.env.GOOGLE_SHARED_DRIVE_ID;
  if (!driveId) return { ok: false, error: "GOOGLE_SHARED_DRIVE_ID not configured", status: 500 };

  const sb = supabaseAdmin();
  let q = sb.from("articles").select("id,kind,slug,title,body_md,google_doc_id");
  if (onlySlug) q = q.eq("slug", onlySlug);
  const { data: rows, error } = await q;
  if (error) return { ok: false, error: error.message, status: 500 };

  // Only provision rows that don't already have a Doc.
  const todo = (rows || []).filter((r) => !r.google_doc_id || !r.google_doc_id.trim());
  if (!todo.length) return { ok: true, created: 0, note: "Every targeted article already has a Doc." };

  let token;
  try { token = await getGoogleToken(DRIVE_SCOPE); }
  catch (e) { return { ok: false, error: String(e.message || e), status: 500 }; }

  let created = 0;
  const failures = [];
  const links = [];
  for (const r of todo) {
    try {
      // 1. Create an empty Doc in the shared drive.
      const cRes = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ name: r.title || r.slug, mimeType: "application/vnd.google-apps.document", parents: [driveId] }),
      });
      const cJson = await cRes.json().catch(() => ({}));
      if (!cRes.ok || !cJson.id) { failures.push(`${r.slug}: create ${cRes.status} ${cJson.error?.message || ""}`.trim()); continue; }
      const docId = cJson.id;

      // 2. Fill it with formatted content.
      const { requests } = markdownToDocsRequests(r.body_md || `# ${r.title || r.slug}\n`);
      const uRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ requests }),
      });
      if (!uRes.ok) { const b = await uRes.json().catch(() => ({})); failures.push(`${r.slug}: fill ${uRes.status} ${b.error?.message || ""}`.trim()); continue; }

      // 3. Store the Doc id + mark it as synced from now (content already matches).
      const { error: e } = await sb.from("articles").update({ google_doc_id: docId, synced_at: new Date().toISOString() }).eq("id", r.id);
      if (e) { failures.push(`${r.slug}: DB write ${e.message}`); continue; }
      created++;
      links.push({ slug: r.slug, url: `https://docs.google.com/document/d/${docId}/edit` });
    } catch (e) {
      failures.push(`${r.slug}: ${String(e.message || e)}`);
    }
  }
  return { ok: failures.length === 0, created, links, failures };
}

export async function POST(req) {
  const { password, slug } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run(slug || null);
  return Response.json(r, { status: r.status || (r.ok ? 200 : 500) });
}
