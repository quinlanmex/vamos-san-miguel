import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 120;

const INTERESTS = ["food", "cafes", "art", "culture", "outdoors", "nightlife", "wellness", "shopping", "family"];
const SLOTS = ["morning", "cafe", "lunch", "afternoon", "dinner", "evening"];
const KINDS = ["pick", "event"];

// Cap how much of the catalog we hand the model, to keep token cost predictable.
const MAX_PICKS = 120;
const MAX_EVENTS = 40;

function clampDays(d) {
  const n = Math.round(Number(d));
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, n));
}

export async function POST(req) {
  // 1. Guard.
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ ok: false, error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const days = clampDays(body.days);
  const party = typeof body.party === "string" && body.party.trim() ? body.party.trim() : "couple";
  const pace = ["relaxed", "balanced", "packed"].includes(body.pace) ? body.pace : "balanced";
  const interests = Array.isArray(body.interests) ? body.interests.filter((i) => INTERESTS.includes(i)) : [];
  const stay = Array.isArray(body.stay) && body.stay.length === 2 && body.stay.every((n) => typeof n === "number") ? body.stay : null;
  const mustInclude = Array.isArray(body.mustInclude) ? body.mustInclude.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()) : [];
  const lang = body.lang === "es" ? "es" : "en";

  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

  // 2. Load the catalog from Supabase (service role).
  let picks = [];
  let events = [];
  try {
    const sb = supabaseAdmin();

    const { data: placeRows, error: placeErr } = await sb
      .from("places")
      .select("name, list_key, cuisine, area, desc_en, ai_notes, lat, lng")
      .eq("status", "published")
      .eq("editorial", true)
      .not("business_status", "is", "CLOSED_PERMANENTLY");
    if (placeErr) throw new Error("places: " + placeErr.message);
    picks = (placeRows || []).filter((r) => r && r.name);

    const { data: eventRows, error: eventErr } = await sb
      .from("events")
      .select("title_en, category, start_date, end_date, recurring, venue, area, lat, lng")
      .eq("status", "published");
    if (eventErr) throw new Error("events: " + eventErr.message);
    events = (eventRows || []).filter((r) => {
      if (!r || !r.title_en) return false;
      if (r.recurring) return true; // recurring always kept
      const last = r.end_date || r.start_date;
      return last && String(last).slice(0, 10) >= todayStr; // future only
    });
  } catch (err) {
    return Response.json({ ok: false, error: err.message || "catalog load failed" }, { status: 500 });
  }

  // Prioritize any mustInclude names so they survive the cap.
  const mustLower = new Set(mustInclude.map((s) => s.toLowerCase()));
  if (mustLower.size) {
    picks.sort((a, b) => (mustLower.has((b.name || "").toLowerCase()) ? 1 : 0) - (mustLower.has((a.name || "").toLowerCase()) ? 1 : 0));
    events.sort((a, b) => (mustLower.has((b.title_en || "").toLowerCase()) ? 1 : 0) - (mustLower.has((a.title_en || "").toLowerCase()) ? 1 : 0));
  }

  const capPicks = picks.slice(0, MAX_PICKS);
  const capEvents = events.slice(0, MAX_EVENTS);

  // 3. Compact text catalog for the model.
  const pickLines = capPicks.map((p) => {
    const tags = Array.isArray(p.cuisine) ? p.cuisine.filter(Boolean).join(",") : "";
    const note = (p.ai_notes || p.desc_en || "").replace(/\s+/g, " ").slice(0, 200);
    return `PICK | ${p.name} | type:${p.list_key || ""} | area:${p.area || ""} | tags:${tags}${note ? ` | ${note}` : ""}`;
  });
  const eventLines = capEvents.map((e) => `EVENT | ${e.title_en} | ${e.start_date || "recurring"} | ${e.category || ""} | venue:${e.venue || ""}`);
  const catalog = pickLines.concat(eventLines).join("\n");

  // Resolution maps (case-insensitive) so we can validate + attach coords later.
  const pickByName = new Map();
  capPicks.forEach((p) => pickByName.set((p.name || "").toLowerCase(), p));
  const eventByTitle = new Map();
  capEvents.forEach((e) => eventByTitle.set((e.title_en || "").toLowerCase(), e));

  // 4. Build the prompt + call Anthropic.
  const langLine = lang === "es"
    ? `Write "summary", each day "title", and every "why" in natural Mexican Spanish. Keep item names/titles EXACTLY as they appear in the catalog (do NOT translate names).`
    : `Write "summary", each day "title", and every "why" in English.`;

  const prompt = `You are a San Miguel de Allende (Mexico) local trip planner. Build a realistic ${days}-day itinerary.

TRAVELER:
- Party: ${party}
- Pace: ${pace} (relaxed = fewer stops per day; packed = more stops)
- Interests: ${interests.length ? interests.join(", ") : "general"}
- Lodging coordinates: ${stay ? `[${stay[0]}, ${stay[1]}]` : "not provided"}
- Must include (prioritize these exact names): ${mustInclude.length ? mustInclude.join(", ") : "none"}
- Today's date: ${todayStr}

RULES:
- Use ONLY items from the CATALOG below. Reference each by its EXACT name/title as written.
- Do NOT invent places or events. If unsure, leave it out.
- Cluster each day by neighborhood/area to minimize travel.
- If lodging coordinates are given, start and end each day near there.
- Spread meals sensibly across each day: a breakfast/cafe, a lunch, and a dinner.
- Include EVENTs only if their date plausibly falls within a ${days}-day trip starting around ${todayStr} AND they match the traveler's interests. Recurring events are fine.
- Prioritize any "must include" names.
- Match the party (kid-friendly choices for families) and the pace.
- ${langLine}

CATALOG:
${catalog}

Return STRICT JSON ONLY (no prose, no markdown fences), exactly this shape:
{"summary": string, "days":[{"day":1,"title":string,"items":[{"slot":"morning"|"cafe"|"lunch"|"afternoon"|"dinner"|"evening","name":string,"kind":"pick"|"event","why":string}]}]}`;

  let parsed;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("");
    const m = raw.match(/\{[\s\S]*\}/); // outermost {...}
    if (!m) throw new Error("no JSON object in model reply");
    parsed = JSON.parse(m[0]);
  } catch (err) {
    return Response.json({ ok: false, error: err.message || "planning failed" }, { status: 500 });
  }

  // 5. Validate + resolve against the catalog. Drop anything hallucinated.
  const outDays = [];
  const rawDays = Array.isArray(parsed?.days) ? parsed.days : [];
  rawDays.forEach((d, di) => {
    const rawItems = Array.isArray(d?.items) ? d.items : [];
    const items = [];
    rawItems.forEach((it) => {
      if (!it || typeof it.name !== "string") return;
      const key = it.name.trim().toLowerCase();
      const slot = SLOTS.includes(it.slot) ? it.slot : "afternoon";
      const kindHint = KINDS.includes(it.kind) ? it.kind : null;
      const why = typeof it.why === "string" ? it.why : "";

      // Prefer the kind the model claimed, but fall back to the other map so a
      // mislabeled-but-real item still resolves instead of being dropped.
      const pick = pickByName.get(key);
      const event = eventByTitle.get(key);
      if ((kindHint === "pick" && pick) || (!event && pick)) {
        items.push({
          slot, kind: "pick", why,
          name: pick.name,
          list_key: pick.list_key || null,
          area: pick.area || null,
          lat: pick.lat ?? null,
          lng: pick.lng ?? null,
        });
      } else if (event) {
        items.push({
          slot, kind: "event", why,
          name: event.title_en,
          category: event.category || null,
          start_date: event.start_date || null,
          end_date: event.end_date || null,
          recurring: !!event.recurring,
          venue: event.venue || null,
          area: event.area || null,
          lat: event.lat ?? null,
          lng: event.lng ?? null,
        });
      }
      // else: hallucinated -> dropped.
    });
    outDays.push({
      day: typeof d?.day === "number" ? d.day : di + 1,
      title: typeof d?.title === "string" ? d.title : "",
      items,
    });
  });

  return Response.json({
    ok: true,
    summary: typeof parsed?.summary === "string" ? parsed.summary : "",
    days: outDays,
  });
}
