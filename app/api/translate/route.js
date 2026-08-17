import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

// Translate one or more short English fields to natural Mexican Spanish. Used by the admin
// editor so Spanish copy tracks the English. Returns a map keyed the same as the input.
export async function POST(req) {
  const { password, texts } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  // Accept { texts: { key: english } } and only translate non-empty strings.
  const entries = Object.entries(texts && typeof texts === "object" ? texts : {})
    .filter(([, v]) => typeof v === "string" && v.trim())
    .slice(0, 20);
  if (!entries.length) return Response.json({ ok: true, texts: {} });

  const props = {};
  for (const [k] of entries) props[k] = { type: "string" };
  const tool = {
    name: "emit_translations",
    description: "Return the Mexican Spanish translation of each field, keyed the same.",
    input_schema: { type: "object", properties: props, required: entries.map(([k]) => k) },
  };

  const payload = entries.map(([k, v]) => `[${k}]\n${v}`).join("\n\n");
  const prompt = `Translate each field below into natural, warm Mexican Spanish as used in San Miguel de Allende. Keep proper nouns, place names, and brand names unchanged. Match the tone and length of the original. Never use em-dashes or en-dashes; use commas, periods, or "y". Do not add anything that is not in the source.

FIELDS:
${payload}

Call emit_translations with the Spanish for each field, using the same keys.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      tools: [tool],
      tool_choice: { type: "tool", name: "emit_translations" },
      messages: [{ role: "user", content: prompt }],
    });
    const block = (msg.content || []).find((b) => b.type === "tool_use" && b.name === "emit_translations");
    if (!block || !block.input) throw new Error("no translation returned");
    const out = {};
    for (const [k] of entries) if (typeof block.input[k] === "string") out[k] = block.input[k].trim();
    return Response.json({ ok: true, texts: out });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
