import { run as discoverEvents } from "../discover-events/route";
import { run as dedupEvents } from "../dedup-events/route";
import { run as ingestNewsletters } from "../ingest-newsletters/route";
import { run as geocodeEvents } from "../geocode-events/route";
import { run as driveTimes } from "../drive-times/route";
import { run as enrichPicks } from "../enrich-picks/route";
import { run as draftPicks } from "../draft-picks/route";
import { run as enrichAiNotes } from "../enrich-ai-notes/route";
import { run as enrichLocal } from "../enrich-local/route";
import { run as syncDocs } from "../sync-docs/route";
import { runCheck as checkClosures } from "../check-closures/route";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 300; // Pro allows up to 300s; Hobby caps at 60s (best effort).

// One cron to run ALL automatic maintenance, so the site stays current with zero clicks
// and we stay within Vercel Hobby's cron-count limit. Each job is fill-blanks / update-auto
// only and never touches manually set values. Jobs run sequentially and independently — one
// failing never blocks the others.
async function runAll() {
  const jobs = [
    ["discoverEvents", discoverEvents],   // pull new future events from public sources
    ["ingestNewsletters", ingestNewsletters], // parse event newsletters from the shared inbox
    ["dedupEvents", dedupEvents],         // merge duplicate/recurring events into one listing
    ["geocodeEvents", geocodeEvents],     // fill event map coordinates
    ["driveTimes", driveTimes],           // fill drive time from Centro for out-of-town picks
    ["enrichPicks", enrichPicks],         // pull hours + practical attributes + price for picks
    ["draftPicks", draftPicks],           // draft editorial notes for picks that lack them
    ["enrichAiNotes", enrichAiNotes],     // synthesize an AI-facing profile from reviews + site
    ["enrichLocal", enrichLocal],         // draft opinionated local take, vibe, occasion, internal caveat
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

// How many enrichable picks still need the (last, richest) local-knowledge pass. Only counts
// picks that CAN be enriched (have a google_place_id), so this reaches 0 and stops the chain.
async function enrichmentBacklog() {
  try {
    const sb = supabaseAdmin();
    const { count } = await sb.from("places").select("id", { count: "exact", head: true })
      .eq("status", "published").not("google_place_id", "is", null).is("local_take", null);
    return count || 0;
  } catch { return 0; }
}

// Self-chaining: each run does one capped batch, and if a backlog remains it kicks off the
// next batch itself. So one nightly trigger (or one manual run) cascades through everything
// automatically, then stops when nothing is left. Fire-and-forget; if a link ever drops, the
// next nightly cron simply picks up the remainder (self-healing).
const MAX_CHAIN = 30;
function fireNext(req, chain) {
  try {
    const origin = new URL(req.url).origin;
    fetch(`${origin}/api/cron-daily`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD, chain: chain + 1 }),
    }).catch(() => {});
  } catch { /* ignore */ }
}

async function finish(req, chain) {
  const results = await runAll();
  const remaining = await enrichmentBacklog();
  const chained = remaining > 0 && chain < MAX_CHAIN;
  if (chained) fireNext(req, chain);
  return Response.json({ ok: true, ranAt: new Date().toISOString(), chain, remaining, chained, results });
}

// Cron entry point — protected by Vercel's cron header or a token. Starts the chain (chain=0).
export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  const secret = process.env.CRON_SECRET;
  const isCron = req.headers.get("x-vercel-cron") === "1";
  if (!isCron && !(secret && token === secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return finish(req, 0);
}

// Admin trigger + the self-chain link (POST carries the admin password + the chain depth).
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (body.password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return finish(req, Number(body.chain) || 0);
}
