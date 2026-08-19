import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { cleanDays } from "../discover-events/route";

export const runtime = "nodejs";
export const maxDuration = 120;

// Backfill: figure out which weekdays each existing recurring event repeats on, from clues in
// its own title/description, so the date filters can be precise. Events whose days can't be
// determined are marked with an empty array (checked, unknown) so they are not re-processed and
// the app keeps showing them under every date filter. Only reads each event's own text.
export async function run(limit = 60) {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "ANTHROPIC_API_KEY not configured" };
  let sb;
  try { sb = supabaseAdmin(); } catch (e) { return { ok: false, error: String(e && e.message || e) }; }

  const { data: rows, error } = await sb.from("events")
    .select("id,title_en,blurb_en,venue")
    .eq("status", "published").eq("recurring", true).is("recur_days", null)
    .limit(limit);
  if (error) {
    if (/recur_days/.test(error.message || "")) return { ok: false, error: "run data/add-recur-days.sql first" };
    return { ok: false, error: error.message };
  }
  if (!rows || !rows.length) return { ok: true, considered: 0, resolved: 0, unknown: 0 };

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const list = rows.map((r, i) => `${i}. ${r.title_en}${r.venue ? ` @ ${r.venue}` : ""}${r.blurb_en ? ` - ${r.blurb_en.slice(0, 160)}` : ""}`).join("\n");
  const prompt = `For each recurring San Miguel de Allende event below, determine when it repeats, using ONLY explicit clues in its own title or description (for example "Tuesday market", "every Saturday", "daily", "weekends", "1st Sunday of the month").
- "days": the weekdays as integers 0=Sunday..6=Saturday (e.g. [2] for Tuesdays, [0,6] for weekends, [0,1,2,3,4,5,6] for daily); null if the days are not stated or the pattern is not weekly (e.g. monthly).
- "note"/"note_es": a SHORT human-readable schedule as stated, in English and Mexican Spanish (e.g. "Every Tuesday"/"Cada martes", "1st Sunday of the month"/"1er domingo del mes"); null if not stated.
Return ONLY a JSON array, one object per numbered item: {"i": number, "days": array | null, "note": string | null, "note_es": string | null}. Do NOT guess anything not explicitly stated.

EVENTS:
${list}`;

  let parsed = [];
  try {
    const msg = await anthropic.messages.create({ model: "claude-haiku-4-5-20251001", max_tokens: 1800, messages: [{ role: "user", content: prompt }] });
    const raw = (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("");
    const m = raw.match(/\[[\s\S]*\]/);
    parsed = m ? JSON.parse(m[0]) : [];
  } catch { return { ok: false, error: "inference failed" }; }
  if (!Array.isArray(parsed)) parsed = [];

  const noteOf = (s) => (typeof s === "string" && s.trim()) ? s.trim().slice(0, 80) : null;
  let resolved = 0, unknown = 0, failed = 0;
  for (let idx = 0; idx < rows.length; idx++) {
    const item = parsed.find((p) => Number(p && p.i) === idx);
    const days = cleanDays(item && item.days); // null if unclear
    const note = noteOf(item && item.note);
    // Store [] when unknown so this event is marked checked (not re-queried) but still shows
    // under all date filters via the app's empty-days fallback.
    const patch = { recur_days: days || [] };
    if (note) { patch.recur_note = note; const ne = noteOf(item && item.note_es); if (ne) patch.recur_note_es = ne; }
    let { error: e } = await sb.from("events").update(patch).eq("id", rows[idx].id);
    // If recur_note column is missing, still record the days.
    if (e && /recur_note/.test(e.message || "")) ({ error: e } = await sb.from("events").update({ recur_days: days || [] }).eq("id", rows[idx].id));
    if (e) { failed++; if (/recur_days/.test(e.message || "")) return { ok: false, error: "run data/add-recur-days.sql first" }; continue; }
    if (days || note) resolved++; else unknown++;
  }
  return { ok: true, considered: rows.length, resolved, unknown, failed };
}

export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  const secret = process.env.CRON_SECRET;
  const isCron = req.headers.get("x-vercel-cron") === "1";
  if (!isCron && !(secret && token === secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.ok ? 200 : 500 });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (body.password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const limit = Math.min(Math.max(Number(body.limit) || 200, 1), 400);
  const r = await run(limit);
  return Response.json(r, { status: r.ok ? 200 : 500 });
}
