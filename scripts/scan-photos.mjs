#!/usr/bin/env node
// Scan ONE local folder of images, keep only photos that a vision pass judges to be
// San Miguel de Allende AND free of recognizable people, and upload those to the
// review queue (Supabase Storage "photos" bucket + photo_candidates table). Photos with
// people are never uploaded anywhere.
//
// Setup (once):
//   1. Run data/add-photo-candidates.sql in Supabase.
//   2. Create a PUBLIC Storage bucket named "photos".
//   3. Put these in .env.local (or the environment) — pull from Vercel with
//      `vercel env pull .env.local` if easier:
//        ANTHROPIC_API_KEY=...
//        NEXT_PUBLIC_SUPABASE_URL=...           (or SUPABASE_URL)
//        SUPABASE_SERVICE_ROLE_KEY=...
//
// Run:
//   node scripts/scan-photos.mjs "C:/Users/you/Dropbox/Photos/SMA" --limit 50
//
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// --- tiny .env.local loader (so we don't need dotenv) ---
try {
  const envFile = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {}

const DIR = process.argv[2];
const LIMIT = (() => { const i = process.argv.indexOf("--limit"); return i > -1 ? Number(process.argv[i + 1]) : Infinity; })();
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AI_KEY = process.env.ANTHROPIC_API_KEY;

if (!DIR) { console.error("Usage: node scripts/scan-photos.mjs <folder> [--limit N]"); process.exit(1); }
if (!AI_KEY) { console.error("Missing ANTHROPIC_API_KEY"); process.exit(1); }
if (!SB_URL || !SB_KEY) { console.error("Missing Supabase URL / service role key"); process.exit(1); }

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
const anthropic = new Anthropic({ apiKey: AI_KEY });

const TOOL = {
  name: "classify_photo",
  description: "Judge whether a photo is of San Miguel de Allende and whether it shows recognizable people.",
  input_schema: {
    type: "object",
    properties: {
      is_sma: { type: "boolean", description: "True only if this looks like San Miguel de Allende, Mexico (its architecture, streets, churches, landscapes)." },
      has_people: { type: "boolean", description: "True if any recognizable person or face is visible (even small or in the background). Crowds far away where no face is identifiable can be false." },
      caption: { type: "string", description: "A short, factual caption for the scene." },
      tags: { type: "array", items: { type: "string" }, description: "A few lowercase tags (e.g. parroquia, street, sunset, garden)." },
    },
    required: ["is_sma", "has_people", "caption", "tags"],
  },
};

async function classify(b64, mime) {
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "classify_photo" },
    messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
      { type: "text", text: "Classify this photo with classify_photo. Be strict about has_people for privacy: if you can make out a face or an identifiable person, say true." },
    ] }],
  });
  const block = (msg.content || []).find((b) => b.type === "tool_use");
  return block ? block.input : null;
}

async function main() {
  const files = fs.readdirSync(DIR).filter((f) => MIME[path.extname(f).toLowerCase()]);
  console.log(`Found ${files.length} image(s) in ${DIR}`);

  // Skip files already queued.
  const { data: existing } = await sb.from("photo_candidates").select("source_file");
  const seen = new Set((existing || []).map((x) => x.source_file));

  let kept = 0, skippedPeople = 0, notSma = 0, done = 0;
  for (const f of files) {
    if (done >= LIMIT) break;
    if (seen.has(f)) continue;
    const full = path.join(DIR, f);
    const stat = fs.statSync(full);
    if (stat.size > 5 * 1024 * 1024) { console.log(`  skip (>5MB, resize first): ${f}`); continue; }
    done++;
    const mime = MIME[path.extname(f).toLowerCase()];
    const b64 = fs.readFileSync(full).toString("base64");
    let c;
    try { c = await classify(b64, mime); } catch (e) { console.log(`  error classifying ${f}: ${e.message}`); continue; }
    if (!c) { console.log(`  no result: ${f}`); continue; }
    if (!c.is_sma) { notSma++; console.log(`  skip (not SMA): ${f}`); continue; }
    if (c.has_people) { skippedPeople++; console.log(`  skip (has people): ${f}`); continue; }

    // Upload only clean SMA photos.
    const key = `candidates/${Date.now()}-${f.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await sb.storage.from("photos").upload(key, fs.readFileSync(full), { contentType: mime, upsert: false });
    if (up.error) { console.log(`  upload failed ${f}: ${up.error.message}`); continue; }
    const { data: pub } = sb.storage.from("photos").getPublicUrl(key);
    const { error: insErr } = await sb.from("photo_candidates").insert({ url: pub.publicUrl, storage_path: key, caption: c.caption || null, tags: Array.isArray(c.tags) ? c.tags.slice(0, 8) : [], source_file: f });
    if (insErr) { console.log(`  db insert failed ${f}: ${insErr.message}`); continue; }
    kept++; console.log(`  queued: ${f} — ${c.caption || ""}`);
  }
  console.log(`\nDone. Queued ${kept}, skipped ${skippedPeople} with people, ${notSma} not-SMA. Reviewed ${done}.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
