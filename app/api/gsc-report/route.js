import { gscHealthReport } from "../../../lib/gsc";

export const runtime = "nodejs";
export const maxDuration = 60;

// SEO health report from Google Search Console, for the automated monitor. Read-only.
// GET  = scheduled/agent (Vercel cron header, or ?token=CRON_SECRET)
// POST = manual admin trigger ({ password })

async function run() {
  try {
    return { ok: true, report: await gscHealthReport() };
  } catch (e) {
    // The most common cause is setup not finished — surface it clearly.
    return { ok: false, error: e.message, hint: "Confirm the service account is added as a user on the GSC property and the Search Console API is enabled in Google Cloud." };
  }
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
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await run();
  return Response.json(r, { status: r.ok ? 200 : 500 });
}
