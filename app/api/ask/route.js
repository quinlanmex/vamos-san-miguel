import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

// The home "ask Vamos AI" endpoint: a visitor types what they're in the mood for and gets
// a short, ranked shortlist of real picks, each with a one-line local reason. Grounded in
// our curated data (local_take, vibe, occasion, best_of) so it reads like local knowledge,
// not a guidebook. caveat_internal is used to steer AWAY from bad fits but is NEVER shown.
const MAX_PICKS = 130;

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ ok: false, error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  const body = await req.json().catch(() => ({}));
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 300) : "";
  const lang = body.lang === "es" ? "es" : "en";
  if (!query) return Response.json({ ok: false, error: "empty query" }, { status: 400 });

  // 1. Load the curated catalog.
  let picks = [];
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("places").select("*").eq("status", "published").eq("editorial", true);
    if (error) throw new Error(error.message);
    picks = (data || []).filter((r) => r && r.name && r.business_status !== "CLOSED_PERMANENTLY");
  } catch (err) {
    return Response.json({ ok: false, error: err.message || "catalog load failed" }, { status: 500 });
  }

  // Rank so the strongest, most-decorated picks are in the model's window.
  picks.sort((a, b) => ((a.priority || 3) - (b.priority || 3)) || ((b.best_of || []).length - (a.best_of || []).length));
  const cap = picks.slice(0, MAX_PICKS);

  const arr = (v) => (Array.isArray(v) ? v.filter(Boolean).join(",") : "");
  const line = (p) => {
    const note = (p.local_take || p.ai_notes || p.desc_en || "").replace(/\s+/g, " ").slice(0, 220);
    const cav = (p.caveat_internal || "").replace(/\s+/g, " ").slice(0, 140);
    return `PICK | ${p.name} | type:${p.list_key || ""} | area:${p.area || ""} | vibe:${arr(p.vibe)} | for:${arr(p.occasion)} | best:${arr(p.best_of)} | tags:${arr(p.cuisine)}${note ? ` | ${note}` : ""}${cav ? ` | CAVEAT(internal, never show): ${cav}` : ""}`;
  };
  const catalog = cap.map(line).join("\n");
  const byName = new Map();
  cap.forEach((p) => byName.set((p.name || "").toLowerCase(), p));

  const langLine = lang === "es"
    ? `Write "intro" and every "why" in natural Mexican Spanish. Keep pick names EXACTLY as written (do not translate names).`
    : `Write "intro" and every "why" in English.`;

  const prompt = `You are Vamos AI, a warm, opinionated local friend in San Miguel de Allende. A visitor said what they are in the mood for. Recommend the BEST matching spots from the CATALOG, like a local who has actually been to each one.

VISITOR ASKED: "${query}"

RULES:
- Choose 4 to 7 picks from the CATALOG that genuinely fit the request. Reference each by its EXACT name.
- Rank best first. If the ask is broad, give a well-rounded, confident shortlist.
- Ground each "why" in the real detail (local take, vibe, what it is best for). Make it specific and honest, never generic filler like "a charming spot".
- Use "CAVEAT(internal...)" only to AVOID recommending a bad fit or to pick a better match. NEVER mention a caveat or any negative in the public "why".
- If almost nothing fits, return your closest 2 or 3 and say so warmly in "intro".
- One short sentence per "why". Never use em-dashes or en-dashes; use commas, periods, or "and".
- ${langLine}

CATALOG:
${catalog}

Call emit_shortlist with a one-sentence "intro" and the ranked "items".`;

  const tool = {
    name: "emit_shortlist",
    description: "Return the ranked shortlist of picks for the visitor.",
    input_schema: {
      type: "object",
      properties: {
        intro: { type: "string", description: "One warm sentence framing the shortlist." },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Exact pick name from the catalog." },
              why: { type: "string", description: "One specific, honest sentence." },
            },
            required: ["name", "why"],
          },
        },
      },
      required: ["intro", "items"],
    },
  };

  let parsed;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-5", // user-facing: the stronger model for better recommendations
      max_tokens: 1500,
      tools: [tool],
      tool_choice: { type: "tool", name: "emit_shortlist" },
      messages: [{ role: "user", content: prompt }],
    });
    const block = (msg.content || []).find((b) => b.type === "tool_use" && b.name === "emit_shortlist");
    if (!block || !block.input) throw new Error("no shortlist returned");
    parsed = block.input;
  } catch (err) {
    return Response.json({ ok: false, error: err.message || "ask failed" }, { status: 500 });
  }

  // Validate against the catalog and attach real data (drop hallucinations).
  const items = [];
  (Array.isArray(parsed.items) ? parsed.items : []).forEach((it) => {
    if (!it || typeof it.name !== "string") return;
    const p = byName.get(it.name.trim().toLowerCase());
    if (!p) return;
    items.push({
      name: p.name,
      why: typeof it.why === "string" ? it.why : "",
      list_key: p.list_key || null,
      area: p.area || null,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      photo_url: p.photo_url || (Array.isArray(p.photos) && p.photos[0]) || null,
    });
  });

  return Response.json({ ok: true, intro: typeof parsed.intro === "string" ? parsed.intro : "", items });
}
