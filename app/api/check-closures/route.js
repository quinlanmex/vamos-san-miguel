import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

// Classic Places Details: returns business_status (OPERATIONAL / CLOSED_PERMANENTLY / CLOSED_TEMPORARILY).
async function fetchStatus(placeId, key) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=business_status&key=${key}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  if (data.status && data.status !== "OK") return null;
  return (data.result && data.result.business_status) || "OPERATIONAL";
}

async function runCheck() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { error: "GOOGLE_MAPS_API_KEY not configured", status: 500 };
  const sb = supabaseAdmin();
  const { data: places, error } = await sb
    .from("places")
    .select("id,name,google_place_id,business_status,closed_at")
    .not("google_place_id", "is", null);
  if (error) return { error: error.message, status: 500 };

  const now = new Date().toISOString();
  let checked = 0;
  const newlyClosed = [], reopened = [];

  for (const p of places || []) {
    const st = await fetchStatus(p.google_place_id, key);
    if (!st) continue;
    checked++;
    const patch = { business_status: st, status_checked_at: now };
    if (st === "CLOSED_PERMANENTLY" && p.business_status !== "CLOSED_PERMANENTLY") {
      patch.closed_at = now; newlyClosed.push(p.name);
    } else if (st === "OPERATIONAL" && p.business_status === "CLOSED_PERMANENTLY") {
      patch.closed_at = null; reopened.push(p.name); // reopened -> reappears on the live site
    }
    await sb.from("places").update(patch).eq("id", p.id);
  }
  return { ok: true, checked, closedCount: newlyClosed.length, reopenedCount: reopened.length, newlyClosed, reopened };
}

// Manual trigger from the admin tool (password in body).
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (body.password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await runCheck();
  return Response.json(r, { status: r.status || 200 });
}

// Scheduled trigger (Vercel Cron). Protected by a shared secret in the query string.
export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  const secret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!(secret && token === secret) && !isVercelCron) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await runCheck();
  return Response.json(r, { status: r.status || 200 });
}
