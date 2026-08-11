import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "media";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

function slug(s) {
  return String(s || "photo").toLowerCase().replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "photo";
}
function ext(type) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" })[type] || "jpg";
}

export async function POST(req) {
  let form;
  try { form = await req.formData(); } catch { return Response.json({ error: "Expected multipart form data." }, { status: 400 }); }

  if (form.get("password") !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") return Response.json({ error: "No file provided." }, { status: 400 });
  if (!OK_TYPES.includes(file.type)) return Response.json({ error: `Unsupported type: ${file.type || "unknown"}. Use JPG, PNG, WebP, GIF, or AVIF.` }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: `Too large (${(file.size / 1e6).toFixed(1)} MB). Max 8 MB.` }, { status: 400 });

  let sb;
  try { sb = supabaseAdmin(); } catch (e) { return Response.json({ error: String(e.message || e) }, { status: 500 }); }

  // Make sure the public bucket exists (first upload creates it).
  try {
    const { data: buckets } = await sb.storage.listBuckets();
    if (!(buckets || []).some((b) => b.name === BUCKET)) {
      const { error } = await sb.storage.createBucket(BUCKET, { public: true });
      if (error && !/already exists/i.test(error.message)) return Response.json({ error: `Bucket: ${error.message}` }, { status: 500 });
    }
  } catch (e) { return Response.json({ error: `Bucket check: ${String(e.message || e)}` }, { status: 500 }); }

  const folder = (form.get("kind") === "event") ? "events" : "picks";
  const path = `${folder}/${Date.now()}-${slug(file.name)}.${ext(file.type)}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buf, { contentType: file.type, upsert: false });
  if (upErr) return Response.json({ error: `Upload: ${upErr.message}` }, { status: 500 });

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return Response.json({ ok: true, url: data.publicUrl });
}
