import crypto from "crypto";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 120;

// Google Docs -> website sync.
//
// Each articles row can point at a Google Doc via google_doc_id. This route mints
// a service-account access token (no googleapis dependency, just node crypto),
// pulls each mapped Doc, converts it to markdown, and writes it to body_md. Runs
// on a daily cron and on-demand from the admin page.
//
// Setup (one time):
//   1. Create a Google Cloud service account, enable the Google Docs API.
//   2. Put its JSON key in the Vercel env var GOOGLE_SERVICE_ACCOUNT_JSON (whole JSON).
//   3. Share each article Doc with the service account's client_email (Viewer).
//   4. Paste each Doc's ID into the matching article in /admin/manage.

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken() {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!rawJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
  let sa;
  try { sa = JSON.parse(rawJson); } catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON"); }
  if (!sa.client_email || !sa.private_key) throw new Error("Service account JSON missing client_email/private_key");

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/documents.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  }));
  const signingInput = `${header}.${claim}`;
  const signature = b64url(crypto.createSign("RSA-SHA256").update(signingInput).sign(sa.private_key));
  const jwt = `${signingInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) throw new Error("Token exchange failed: " + (j.error_description || j.error || res.status));
  return j.access_token;
}

// --- Google Docs document JSON -> markdown ------------------------------------

function runToMd(el) {
  const tr = el.textRun;
  if (!tr || tr.content == null) return "";
  let text = tr.content.replace(/\n$/, ""); // paragraph newline handled by caller
  if (!text) return "";
  const s = tr.textStyle || {};
  if (s.bold) text = `**${text}**`;
  if (s.italic) text = `*${text}*`;
  const url = s.link && s.link.url;
  if (url) text = `[${text}](${url})`;
  return text;
}

function headingPrefix(styleType) {
  switch (styleType) {
    case "TITLE":
    case "HEADING_1": return "# ";
    case "HEADING_2": return "## ";
    case "HEADING_3": return "### ";
    case "HEADING_4": return "#### ";
    case "HEADING_5": return "##### ";
    case "HEADING_6": return "###### ";
    default: return "";
  }
}

function docToMarkdown(doc) {
  const lists = doc.lists || {};
  const content = (doc.body && doc.body.content) || [];
  const out = [];

  for (const block of content) {
    const p = block.paragraph;
    if (!p) continue; // skip tables/section breaks
    const text = (p.elements || []).map(runToMd).join("").trim();
    if (!text) { out.push(""); continue; }

    if (p.bullet) {
      const level = p.bullet.nestingLevel || 0;
      const indent = "  ".repeat(level);
      let ordered = false;
      const list = lists[p.bullet.listId];
      const glyph = list && list.listProperties && list.listProperties.nestingLevels
        && list.listProperties.nestingLevels[level] && list.listProperties.nestingLevels[level].glyphType;
      if (glyph && /DECIMAL|ALPHA|ROMAN/i.test(glyph)) ordered = true;
      out.push(`${indent}${ordered ? "1." : "-"} ${text}`);
      continue;
    }

    const prefix = headingPrefix(p.paragraphStyle && p.paragraphStyle.namedStyleType);
    out.push(prefix ? `\n${prefix}${text}` : text);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

async function run() {
  const sb = supabaseAdmin();
  const { data: rows, error } = await sb
    .from("articles")
    .select("id,slug,google_doc_id")
    .not("google_doc_id", "is", null);
  if (error) return { ok: false, error: error.message, status: 500 };
  const mapped = (rows || []).filter((r) => r.google_doc_id && r.google_doc_id.trim());
  if (!mapped.length) return { ok: true, synced: 0, note: "No articles have a google_doc_id yet." };

  let token;
  try { token = await getAccessToken(); }
  catch (e) { return { ok: false, error: String(e.message || e), status: 500 }; }

  let synced = 0;
  const failures = [];
  for (const r of mapped) {
    try {
      const docId = r.google_doc_id.trim();
      const res = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        failures.push(`${r.slug}: Doc fetch ${res.status} (shared with the service account?)`);
        continue;
      }
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
