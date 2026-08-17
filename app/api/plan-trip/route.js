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
  const startDate = typeof body.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate) ? body.startDate : null;
  // Optional walking route to build a day around: { name, points:[{lat,lng,label}] }.
  const walk = body.walk && typeof body.walk === "object" && Array.isArray(body.walk.points) && body.walk.points.length
    ? { name: typeof body.walk.name === "string" ? body.walk.name.slice(0, 120) : "the walk", points: body.walk.points.filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number").slice(0, 40) }
    : null;

  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

  // If the traveler picked a start date, spell out each day's real date + weekday so the
  // model can drop dated events on the right day and place weekday-specific spots
  // (e.g. a Saturday-only market) correctly.
  let dateLines = "";
  let lastDateStr = null;
  if (startDate) {
    const [yy, mm, dd] = startDate.split("-").map(Number);
    const base = new Date(yy, mm - 1, dd);
    const parts = [];
    for (let i = 0; i < days; i++) {
      const dt = new Date(base); dt.setDate(base.getDate() + i);
      const wd = dt.toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { weekday: "long" });
      const ds = dt.toLocaleDateString("en-CA");
      parts.push(`Day ${i + 1}: ${ds} (${wd})`);
      lastDateStr = ds;
    }
    dateLines = parts.join("\n");
  }

  // 2. Load the catalog from Supabase (service role).
  let picks = [];
  let events = [];
  try {
    const sb = supabaseAdmin();

    const { data: placeRows, error: placeErr } = await sb
      .from("places")
      .select("*") // "*" so it never breaks if optional columns (priority, ai_notes) aren't migrated yet
      .eq("status", "published")
      .eq("editorial", true);
    if (placeErr) throw new Error("places: " + placeErr.message);
    // Drop permanently-closed spots in JS (avoids an invalid PostgREST filter).
    picks = (placeRows || []).filter((r) => r && r.name && r.business_status !== "CLOSED_PERMANENTLY");

    const { data: eventRows, error: eventErr } = await sb
      .from("events")
      .select("*") // "*" so it never breaks if priority isn't migrated yet
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

  // Out-of-town flag (straight-line km from the Jardin). Used to gate far spots to longer trips.
  const CENTRO = [20.9143, -100.7436];
  const farOf = (p) => {
    if (p.lat == null || p.lng == null) return false;
    const R = 6371, tr = (x) => (x * Math.PI) / 180;
    const dLat = tr(p.lat - CENTRO[0]), dLng = tr(p.lng - CENTRO[1]);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(tr(CENTRO[0])) * Math.cos(tr(p.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s)) > 5; // >5 km = out of town
  };

  // Rank for the cap: must-include first, then by priority (1 essential ... 3 filler).
  const mustLower = new Set(mustInclude.map((s) => s.toLowerCase()));
  const rank = (p, nameKey) => (mustLower.has((p[nameKey] || "").toLowerCase()) ? -10 : 0) + (p.priority || 3);
  picks.sort((a, b) => rank(a, "name") - rank(b, "name"));
  const evRank = (e) => (mustLower.has((e.title_en || "").toLowerCase()) ? -10 : 0) + (e.priority || 3);
  events.sort((a, b) => evRank(a) - evRank(b));

  const capPicks = picks.slice(0, MAX_PICKS);
  const capEvents = events.slice(0, MAX_EVENTS);

  // 3. Compact text catalog for the model.
  const pickLines = capPicks.map((p) => {
    const tags = Array.isArray(p.cuisine) ? p.cuisine.filter(Boolean).join(",") : "";
    const note = (p.ai_notes || p.desc_en || "").replace(/\s+/g, " ").slice(0, 200);
    return `PICK | ${p.name} | type:${p.list_key || ""} | area:${p.area || ""} | pri:${p.priority || 3}${farOf(p) ? " | FAR" : ""} | tags:${tags}${note ? ` | ${note}` : ""}`;
  });
  const eventLines = capEvents.map((e) => `EVENT | ${e.title_en} | ${e.start_date || "recurring"} | ${e.category || ""} | pri:${e.priority || 3} | venue:${e.venue || ""}`);
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
${dateLines ? `\nTRIP DATES (use these to place dated events and weekday-specific spots on the correct day):\n${dateLines}\n` : ""}${walk ? `\nWALKING ROUTE the traveler chose (build one day around it): "${walk.name}"\nStops: ${walk.points.map((p, i) => `${i + 1}. ${p.label || `[${p.lat.toFixed(4)},${p.lng.toFixed(4)}]`}`).join("; ")}\nOn that day, follow this route in order and weave in CATALOG picks (cafes, meals, galleries) that sit near these stops so the day flows along the walk.\n` : ""}
RULES:
- Use ONLY items from the CATALOG below. Reference each by its EXACT name/title as written.
- Do NOT invent places or events. If unsure, leave it out.
- RANKING (important): each PICK and EVENT has "pri:" = importance (1 = essential/iconic, 2 = highly recommended, 3 = optional). ALWAYS include every pri:1 essential that fits the party, ideally early in the trip. Include pri:2 when it fits the days and interests. Use pri:3 to fill remaining gaps. Favor pri:1 and pri:2 events over pri:3 events when dates allow.
- "FAR" marks an out-of-town spot. Only include FAR picks for trips of 3 or more days, and only when they match the party and interests (e.g. a FAR family spot for a family on a longer trip). For 1 to 2 day trips, keep everything in and around town.
- Cluster each day by neighborhood/area to minimize travel.
- If lodging coordinates are given, start and end each day near there.
- Spread meals sensibly across each day: a breakfast/cafe, a lunch, and a dinner.
- Include EVENTs only if their date falls on one of the TRIP DATES above (or, for recurring events, on a matching weekday) AND they match the traveler's interests. Put each event on the day its date matches. If no trip dates are given, include an event only if its date plausibly falls within a ${days}-day trip starting around ${todayStr}.
- Some picks are weekday-specific (their note may say "Saturdays only" or similar). Place these only on the day whose weekday matches.
- MUST INCLUDE: the "must include" names are places the traveler already saved and chose. Include EVERY one of them somewhere in the trip, each on a sensible day. Do not omit any saved spot.
- Match the party (kid-friendly choices for families) and the pace.
- Keep each "why" to ONE short sentence (about 12 to 18 words) so plans render fast and read cleanly.
- Never use em-dashes or en-dashes. Use commas, periods, or "and" instead.
- ${langLine}

CATALOG:
${catalog}

Call the emit_itinerary tool with the finished plan. Produce exactly ${days} day object(s). Every "slot" must be one of: ${SLOTS.join(", ")}. Every "kind" must be "pick" or "event".`;

  // Structured tool output: the model returns the itinerary as a tool call, so the
  // SDK hands us guaranteed-valid JSON. This avoids the "malformed JSON" parse
  // failures that plain text output occasionally caused.
  const ITINERARY_TOOL = {
    name: "emit_itinerary",
    description: "Return the finished San Miguel de Allende itinerary.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "A short overview of the whole trip." },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "integer" },
              title: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    slot: { type: "string", enum: SLOTS },
                    name: { type: "string", description: "Exact name/title from the catalog." },
                    kind: { type: "string", enum: KINDS },
                    why: { type: "string", description: "One short sentence." },
                  },
                  required: ["slot", "name", "kind", "why"],
                },
              },
            },
            required: ["day", "title", "items"],
          },
        },
      },
      required: ["summary", "days"],
    },
  };

  let parsed;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-5", // user-facing planner uses the stronger model for better itineraries
      max_tokens: 6000,
      tools: [ITINERARY_TOOL],
      tool_choice: { type: "tool", name: "emit_itinerary" },
      messages: [{ role: "user", content: prompt }],
    });
    const block = (msg.content || []).find((b) => b.type === "tool_use" && b.name === "emit_itinerary");
    if (!block || !block.input) throw new Error("no itinerary returned");
    parsed = block.input;
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
          photo_url: pick.photo_url || (Array.isArray(pick.photos) && pick.photos[0]) || null,
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
