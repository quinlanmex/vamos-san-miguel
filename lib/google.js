import crypto from "crypto";

// Shared Google auth + markdown<->Docs helpers for the Docs-sync feature.

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Mint a service-account access token for the given scope(s). No googleapis dep.
// Pass `subject` to impersonate a Workspace user via domain-wide delegation (e.g. to
// read a shared inbox) — requires the scope to be authorized for the SA in the Admin console.
export async function getGoogleToken(scope, subject) {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!rawJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
  let sa;
  try { sa = JSON.parse(rawJson); } catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON"); }
  if (!sa.client_email || !sa.private_key) throw new Error("Service account JSON missing client_email/private_key");

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
    ...(subject ? { sub: subject } : {}),
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

// --- Google Docs document JSON -> markdown -----------------------------------

function runToMd(el) {
  const tr = el.textRun;
  if (!tr || tr.content == null) return "";
  let text = tr.content.replace(/\n$/, "");
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

export function docToMarkdown(doc) {
  const lists = doc.lists || {};
  const content = (doc.body && doc.body.content) || [];
  const out = [];
  for (const block of content) {
    const p = block.paragraph;
    if (!p) continue;
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

// --- markdown -> Google Docs batchUpdate requests ----------------------------

// Parse inline **bold**, *italic*, [text](url) in one line. `base` is the
// character offset (0-based) of this line's start within the full text string.
function parseInline(s, base) {
  let visible = "";
  const inline = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === "[") {
      const m = /^\[([^\]]+)\]\(([^)]+)\)/.exec(s.slice(i));
      if (m) { const start = base + visible.length; visible += m[1]; inline.push({ start, end: base + visible.length, style: { link: { url: m[2] } } }); i += m[0].length; continue; }
    }
    if (s[i] === "*" && s[i + 1] === "*") {
      const m = /^\*\*([^*]+)\*\*/.exec(s.slice(i));
      if (m) { const start = base + visible.length; visible += m[1]; inline.push({ start, end: base + visible.length, style: { bold: true } }); i += m[0].length; continue; }
    }
    if (s[i] === "*") {
      const m = /^\*([^*]+)\*/.exec(s.slice(i));
      if (m) { const start = base + visible.length; visible += m[1]; inline.push({ start, end: base + visible.length, style: { italic: true } }); i += m[0].length; continue; }
    }
    visible += s[i]; i++;
  }
  return { visible, inline };
}

const HEAD_MAP = { 1: "HEADING_1", 2: "HEADING_2", 3: "HEADING_3", 4: "HEADING_4", 5: "HEADING_5", 6: "HEADING_6" };

// Build a full plain-text string + the styling requests to lay it out. The
// caller inserts `text` at index 1 first, so doc index = 1 + string offset.
export function markdownToDocsRequests(md) {
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
  let text = "";
  const paraStyles = []; // {start,end,namedStyleType}
  const textStyles = []; // {start,end,style}
  const bulletRuns = []; // {start,end,ordered}
  let pending = null;    // active bullet run

  const flush = () => { if (pending) { bulletRuns.push(pending); pending = null; } };

  for (const raw of lines) {
    const h = /^(#{1,6})\s+(.*)$/.exec(raw);
    const ul = /^\s*[-*]\s+(.*)$/.exec(raw);
    const ol = /^\s*\d+\.\s+(.*)$/.exec(raw);
    let content = raw, heading = 0, isBullet = false, ordered = false;
    if (h) { heading = h[1].length; content = h[2]; }
    else if (ul) { isBullet = true; content = ul[1]; }
    else if (ol) { isBullet = true; ordered = true; content = ol[1]; }

    const start = text.length;
    const { visible, inline } = parseInline(content, start);
    text += visible;
    const end = text.length;
    for (const r of inline) if (r.end > r.start) textStyles.push(r);

    if (heading) { flush(); if (end > start) paraStyles.push({ start, end, namedStyleType: HEAD_MAP[heading] }); }
    else if (isBullet) {
      if (pending && pending.ordered !== ordered) flush();
      if (!pending) pending = { start, end, ordered };
      else pending.end = end;
    } else { flush(); }

    text += "\n";
  }
  flush();

  const requests = [{ insertText: { location: { index: 1 }, text } }];
  for (const t of textStyles) {
    const style = {}, fields = [];
    if (t.style.bold) { style.bold = true; fields.push("bold"); }
    if (t.style.italic) { style.italic = true; fields.push("italic"); }
    if (t.style.link) { style.link = t.style.link; fields.push("link"); }
    requests.push({ updateTextStyle: { range: { startIndex: 1 + t.start, endIndex: 1 + t.end }, textStyle: style, fields: fields.join(",") } });
  }
  for (const p of paraStyles) {
    requests.push({ updateParagraphStyle: { range: { startIndex: 1 + p.start, endIndex: 1 + p.end }, paragraphStyle: { namedStyleType: p.namedStyleType }, fields: "namedStyleType" } });
  }
  for (const b of bulletRuns) {
    requests.push({ createParagraphBullets: { range: { startIndex: 1 + b.start, endIndex: 1 + b.end }, bulletPreset: b.ordered ? "NUMBERED_DECIMAL_ALPHA_ROMAN" : "BULLET_DISC_CIRCLE_SQUARE" } });
  }
  return { text, requests };
}
