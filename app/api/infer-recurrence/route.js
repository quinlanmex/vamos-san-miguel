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
  const prompt = `For each recurring San Miguel de Allende event below, determine which weekdays it repeats on, using ONLY explicit clues in its own title or description (for example "Tuesday market", "every Saturday", "daily", "weekends", "Monday to Friday"). Weekdays are integers 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday.
Return ONLY a JSON array, one object per numbered item: {"i": number, "days": array of integers 0-6 | null}. Use null when the days are not clearly stated. Do NOT guess from anything other than an explicit statement of the day(s).

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

  let resolved = 0, unknown = 0, failed = 0;
  for (let idx = 0; idx < rows.length; idx++) {
    const item = parsed.find((p) => Number(p && p.i) === idx);
    const days = cleanDays(item && item.days); // null if unclear
    // Store [] when unknown so this event is marked checked (not re-queried) but still shows
    // under all date filters via the app's empty-days fallback.
    const value = days || [];
    const { error: e } = await sb.from("events").update({ recur_days: value }).eq("id", rows[idx].id);
    if (e) { failed++; if (/recur_days/.test(e.message || "")) return { ok: false, error: "run data/add-recur-days.sql first" }; continue; }
    if (days) resolved++; else unknown++;
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
