import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const CATS = ["musica", "cine", "tours", "comunidad", "charlas", "mercados", "bienestar"];

const EVENT_SYSTEM = `You are the content normalizer for "Vamos San Miguel", a bilingual (English/Spanish) events + local-picks guide for San Miguel de Allende, Mexico. Given raw text about an event (a Facebook post, newsletter, flyer, or listing), extract ONE clean, structured event record.

Rules:
- Rewrite the description in your OWN words — never copy the source's prose. Keep the blurb to 1–2 sentences.
- Provide BOTH English and Spanish for title, blurb, and price. Translate faithfully; keep proper nouns (venue names, people) as-is.
- category MUST be exactly one of: musica, cine, tours, comunidad, charlas, mercados, bienestar. Pick the single best fit.
- audience: include "family" if clearly family-friendly and "teens" if clearly suitable for teens; use an empty array if neither clearly applies.
- Dates as YYYY-MM-DD. Times as 24-hour HH:MM. Use null for anything not stated — NEVER invent dates, times, prices, venues, or URLs. If no year is given, assume the current year.
- If it is a single-day event, set end_date equal to start_date.
- area: the neighborhood/zone (e.g., "Centro") only if stated, else null.
- origin_name / origin_url: the real venue or organizer and their official website, ONLY if clearly identifiable from the text; else null. Do not guess URLs.
- recurring: true if it repeats (weekly, daily, "every Saturday", etc.).
- confidence: your overall confidence that the extraction is accurate.`;

const PLACE_SYSTEM = `You are the content normalizer for "Vamos San Miguel", a bilingual (English/Spanish) guide for San Miguel de Allende, Mexico. Given raw text about a BUSINESS or venue (a restaurant, café, bar, cantina, live-music spot, gallery, or shop) — a description, review, or notes — extract ONE clean, structured "Local Pick" record.

Rules:
- Write a short bilingual description (EN + ES) in your OWN words — 1 sentence capturing what makes it worth visiting. Never copy source prose.
- Keep the business name exactly as given (proper noun); do not translate it.
- category MUST be exactly one of: musica, cine, tours, comunidad, charlas, mercados, bienestar. Use "mercados" for food/drink places (restaurants, cafés); use "musica" for bars and live-music venues. Pick the best fit.
- list_key MUST be exactly one of: rest (restaurants/cafés), bar (bars/cantinas), live (live-music or cultural venues). Pick the best fit.
- audience: include "family" if clearly family-friendly and "teens" if clearly suitable for teens; empty array for adult-only spots like bars.
- diet: include "vegetarian" and/or "vegan" ONLY if the place clearly offers such options; else an empty array.
- area: the neighborhood/zone (e.g., "Centro") only if stated, else null.
- origin_url: the business's official website ONLY if clearly given; else null. Never guess a URL.
- confidence: your overall confidence that the extraction is accurate.`;

const EVENT_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    title_en: { type: "string" }, title_es: { type: "string" },
    blurb_en: { type: ["string", "null"] }, blurb_es: { type: ["string", "null"] },
    category: { type: "string", enum: CATS },
    audience: { type: "array", items: { type: "string", enum: ["family", "teens"] } },
    start_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
    end_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
    start_time: { type: ["string", "null"], description: "24h HH:MM" },
    recurring: { type: "boolean" },
    price_en: { type: ["string", "null"] }, price_es: { type: ["string", "null"] },
    venue: { type: ["string", "null"] }, area: { type: ["string", "null"] },
    origin_name: { type: ["string", "null"] }, origin_url: { type: ["string", "null"] },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
  required: ["title_en", "title_es", "blurb_en", "blurb_es", "category", "audience",
    "start_date", "end_date", "start_time", "recurring", "price_en", "price_es",
    "venue", "area", "origin_name", "origin_url", "confidence"],
};

const PLACE_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    name: { type: "string" },
    desc_en: { type: ["string", "null"] }, desc_es: { type: ["string", "null"] },
    category: { type: "string", enum: CATS },
    list_key: { type: "string", enum: ["rest", "bar", "live"] },
    audience: { type: "array", items: { type: "string", enum: ["family", "teens"] } },
    diet: { type: "array", items: { type: "string", enum: ["vegetarian", "vegan"] } },
    area: { type: ["string", "null"] },
    origin_url: { type: ["string", "null"] },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
  required: ["name", "desc_en", "desc_es", "category", "list_key", "audience", "diet",
    "area", "origin_url", "confidence"],
};

export async function POST(req) {
  const { text, password, kind = "event" } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!text || !text.trim()) {
    return Response.json({ error: "Paste some text first." }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured on the server." }, { status: 500 });
  }

  const isPlace = kind === "place";
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      system: isPlace ? PLACE_SYSTEM : EVENT_SYSTEM,
      messages: [{ role: "user", content: text }],
      output_config: { format: { type: "json_schema", schema: isPlace ? PLACE_SCHEMA : EVENT_SCHEMA } },
    });
    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock) return Response.json({ error: "No structured output returned." }, { status: 502 });
    return Response.json({ record: JSON.parse(textBlock.text) });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
