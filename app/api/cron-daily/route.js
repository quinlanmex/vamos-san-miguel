import { run as discoverEvents } from "../discover-events/route";
import { run as geocodeEvents } from "../geocode-events/route";
import { run as driveTimes } from "../drive-times/route";
import { run as syncDocs } from "../sync-docs/route";
import { runCheck as checkClosures } from "../check-closures/route";

export const runtime = "nodejs";
export const maxDuration = 300; // Pro allows up to 300s; Hobby caps at 60s (best effort).

// One cron to run ALL automatic maintenance, so the site stays current with zero clicks
// and we stay within Vercel Hobby's cron-count limit. Each job is fill-blanks / update-auto
// only and never touches manually set values. Jobs run sequentially and independently — one
// failing never blocks the others.
async function runAll() {
  const jobs = [
    ["discoverEvents", discoverEvents],   // pull new future events from public sources
    ["geocodeEvents", geocodeEvents],     // fill event map coordinates
    ["driveTimes", driveTimes],           // fill drive time from Centro for out-of-town picks
    ["syncDocs", syncDocs],               // pull guide edits from Google Docs
    ["checkClosures", checkClosures],     // hide permanently-closed picks
  ];
  const results = {};
  for (const [name, fn] of jobs) {
    try { results[name] = await fn(); }
    catch (e) { results[name] = { ok: false, error: String(e && e.message || e) }; }
  }
  return results;
}

// Cron entry point — protected by Vercel's cron header or a token.
export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  const secret = process.env.CRON_SECRET;
  const isCron = req.headers.get("x-vercel-cron") === "1";
  if (!isCron && !(secret && token === secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const results = await runAll();
  return Response.json({ ok: true, ranAt: new Date().toISOString(), results });
}

// Optional manual trigger (admin password) — not required; the cron does this on its own.
export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const results = await runAll();
  return Response.json({ ok: true, ranAt: new Date().toISOString(), results });
}
