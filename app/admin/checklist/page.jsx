"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const P = {
  plaster: "#FAF6EF", card: "#fff", ink: "#2A211A", inkSoft: "#6B5D4F", line: "#EAE2D4",
  cobalt: "#15539A", cobaltSoft: "#E7EEF7", rosa: "#E11D74", rosaSoft: "#FBE7F0",
  marigold: "#F2A100", green: "#2F7A63", greenSoft: "#E4F0EB",
};

const OWNER = {
  you: { label: "You", icon: "🧑", color: P.cobalt, soft: P.cobaltSoft },
  claude: { label: "Claude", icon: "🤖", color: P.rosa, soft: P.rosaSoft },
  both: { label: "Together", icon: "🤝", color: P.green, soft: P.greenSoft },
};

// sections → items → subtasks. Each subtask has its own owner + a "how" note.
const SECTIONS = [
  {
    key: "now", title: "Now", when: "the next few weeks", accent: P.rosa,
    blurb: "Start earning and stand up the first content. Nothing here waits on the full book.",
    items: [
      {
        id: "title", title: "Lock the book title & subtitle",
        why: "Everything downstream — book pages, the “Move to SMA” pillar, the ebook cover — keys off this.",
        subs: [
          { id: "title-choose", owner: "both", text: "Pick the final title + subtitle", how: "Done: “The Geography of a Richer Life: How Choosing Where You Live Changes Your Money, Your Time, and Who You Get to Be.”" },
          { id: "title-record", owner: "claude", text: "Record it across the project", how: "Done — saved to memory; I’ll reuse it on every book page." },
        ],
      },
      {
        id: "photos", title: "Capture the first batch of photos / drone",
        why: "Original media is a real moat — for SEO and for trust.",
        subs: [
          { id: "photos-shotlist", owner: "claude", text: "Give you a shot list + specs", how: "Per Local Pick: angles, aspect ratios, resolution, a golden-hour note." },
          { id: "photos-capture", owner: "you", text: "Shoot the photos & drone footage", how: "Only you can — you’re the one on the ground in SMA." },
          { id: "photos-process", owner: "claude", text: "Optimize + wire images into the site", how: "You upload raw; I resize, compress, and place them." },
        ],
      },
      {
        id: "ch4", title: "Rewrite Book Ch 4 (taxes) — facts-only, house voice",
        why: "The sensitive one — proves the neutrality bar for the whole rewrite.",
        subs: [
          { id: "ch4-draft", owner: "claude", text: "Draft book/ch4.md", how: "I write the full neutral rewrite in your voice." },
          { id: "ch4-deaiism", owner: "claude", text: "Strip AI-isms (em-dashes, “not X but Y”, filler)", how: "Done — clean pass applied and saved as the standard for every chapter." },
          { id: "ch4-check", owner: "you", text: "Check tax accuracy + tone", how: "You’re the domain expert; flag anything off." },
          { id: "ch4-revise", owner: "claude", text: "Revise to your notes", how: "I turn your edits around fast." },
        ],
      },
      {
        id: "voice", title: "Lock the house-voice style guide",
        why: "The contract that keeps all 23 chapters sounding like you.",
        subs: [
          { id: "voice-agree", owner: "both", text: "Agree the voice guide", how: "Done — approved." },
          { id: "voice-capture", owner: "claude", text: "Keep it captured for every rewrite", how: "Done — saved." },
        ],
      },
      {
        id: "plan-scaffold", title: "Build the “Plan Your Trip” section + template",
        why: "Gives the visitor affiliate links somewhere to live and earn.",
        subs: [
          { id: "plan-design", owner: "claude", text: "Design the section + reusable page template", how: "I build it end to end." },
          { id: "plan-first", owner: "claude", text: "Ship the first page (“3 days in San Miguel”)", how: "With affiliate slots baked in." },
          { id: "plan-review", owner: "you", text: "Review & tell me tweaks", how: "Quick look; I handle the changes." },
        ],
      },
      {
        id: "picks5", title: "Choose the first 5 Local Picks to feature",
        why: "The launch set that shows off the insider voice + your media.",
        subs: [
          { id: "picks-propose", owner: "claude", text: "Propose candidates + spot gaps", how: "From what’s already in the DB plus category gaps." },
          { id: "picks-pick", owner: "you", text: "Make the final 5 calls", how: "Your taste — the insider judgment is the product." },
          { id: "picks-write", owner: "claude", text: "Draft their bilingual write-ups", how: "I write EN + ES; you approve." },
        ],
      },
      {
        id: "ch4-review", title: "Set the neutrality bar together",
        why: "Once we agree how Ch 4 reads, I apply the same bar everywhere.",
        subs: [
          { id: "review-read", owner: "you", text: "Read the Ch 4 draft", how: "The one judgment call I need you for." },
          { id: "review-bar", owner: "both", text: "Agree the bar", how: "We lock what “facts-only” means in practice." },
        ],
      },
      {
        id: "chips-fix", title: "Fix filter chips running off-screen",
        why: "A visible UX bug that made the site read as unfinished.",
        subs: [
          { id: "chips-wrap", owner: "claude", text: "Wrap the filter row instead of hidden scroll", how: "Done — chips now wrap cleanly on every screen size." },
        ],
      },
      {
        id: "design-pass", title: "Prime-time design polish",
        why: "The site feels flat today. Real images plus a styling pass fix that.",
        subs: [
          { id: "design-build", owner: "claude", text: "Rework cards, type scale, header depth, talavera motif, dark mode", how: "I do the styling; biggest lift lands once real photos are flowing." },
          { id: "design-review", owner: "you", text: "React to a first pass", how: "Tell me what feels right and what doesn’t." },
        ],
      },
      {
        id: "places-api", title: "Set up Google Places for real images",
        why: "A temporary image source (with attribution) until your own photos replace it.",
        subs: [
          { id: "places-key", owner: "you", text: "Create the API key + add GOOGLE_MAPS_API_KEY to Vercel", how: "Google Cloud → enable Places API (New) → billing → key → paste into Vercel env (not in chat)." },
          { id: "places-build", owner: "claude", text: "Build the fetch + attribution + own-photo override", how: "Once the key’s in Vercel, all me." },
        ],
      },
      {
        id: "gmaps-import", title: "Import your Google Maps picks",
        why: "Your list seeds Local Picks and is where the kids start.",
        subs: [
          { id: "gmaps-export", owner: "you", text: "Export your list (Google Takeout) + send me the file", how: "Takeout → Saved / Maps (your places) → download → send it over." },
          { id: "gmaps-load", owner: "claude", text: "Parse + enrich via Places, load as Local Picks", how: "I resolve each place to coords, address, and a photo, then insert them." },
        ],
      },
      {
        id: "crew-page", title: "Build the crew photo/drone tracker",
        why: "A shareable page so your teens see what’s shot and what’s left.",
        subs: [
          { id: "crew-build", owner: "claude", text: "Build map + list + status + location-ordered routes + shared progress", how: "Writes status to the database so all kids see the same truth. Needs the picks imported first." },
          { id: "crew-share", owner: "you", text: "Share the link with the kids", how: "One link; they check places off as they shoot." },
        ],
      },
    ],
  },
  {
    key: "next", title: "Next", when: "1–3 months", accent: P.cobalt,
    blurb: "Once the site is worth promoting: sign up affiliates, convert the book, run the SEO/GEO pass, and turn on the money pages.",
    items: [
      {
        id: "aff-note", title: "Affiliate signups (after design + content are ready)",
        why: "No point driving traffic to a site that isn’t ready to impress. These come after the design pass and content integration.",
        subs: [
          { id: "aff-viator", owner: "you", text: "Viator + GetYourGuide (tours & experiences)", how: "I prep the walkthrough; you create the accounts; I wire the IDs into the site." },
          { id: "aff-booking", owner: "you", text: "Booking.com (hotels & stays)", how: "I prep the partner-program choice; you create the account; I wire the links." },
          { id: "aff-wise", owner: "you", text: "Wise (USD→MXN transfers)", how: "I point you to the right network; you apply; I place the links." },
          { id: "aff-sw", owner: "you", text: "SafetyWing (travel + expat health)", how: "I give you the signup; you create the account; I wire it into the insurance pages." },
        ],
      },
      {
        id: "book-convert", title: "Rewrite & convert Ch 5–23 into web pages",
        why: "The content moat and the mover lane.",
        subs: [
          { id: "conv-rewrite", owner: "claude", text: "Rewrite each chapter (voice + facts-only where needed)", how: "I do the writing; delivered chapter by chapter." },
          { id: "conv-review", owner: "you", text: "Review each for accuracy/tone", how: "Skim + flag; I revise." },
          { id: "conv-pages", owner: "claude", text: "Convert approved chapters into clustered pages", how: "Hub-and-spoke, fully built by me." },
        ],
      },
      {
        id: "seo", title: "SEO / GEO technical pass",
        why: "Makes Google rank it and AI agents cite it.",
        subs: [
          { id: "seo-build", owner: "claude", text: "Server-render + schema.org + sitemap + llms.txt + hreflang", how: "Entirely me — no action needed from you." },
          { id: "seo-approve", owner: "you", text: "Approve going live", how: "One thumbs-up." },
        ],
      },
      {
        id: "aff-pages", title: "Build healthcare/insurance + housing pages",
        why: "The highest-value mover conversions.",
        subs: [
          { id: "affp-build", owner: "claude", text: "Build the pages", how: "I write and build them." },
          { id: "affp-pick", owner: "you", text: "Confirm which insurers/agents to feature", how: "Your call on who we recommend." },
        ],
      },
      {
        id: "es-parity", title: "Spanish parity on top-traffic pages",
        why: "The bilingual edge most competitors don’t attempt.",
        subs: [
          { id: "es-produce", owner: "claude", text: "Produce Mexican-Spanish versions", how: "I draft high-quality ES for the top pages." },
          { id: "es-native", owner: "you", text: "Have a native reviewer check them", how: "See the reviewer item below." },
        ],
      },
      {
        id: "re-deals", title: "Line up real-estate + immigration referral deals",
        why: "Highest $/lead — but relationship-driven, so it’s yours.",
        subs: [
          { id: "re-outreach", owner: "claude", text: "Draft outreach + a shortlist of SMA partners", how: "I write the pitch and research candidates." },
          { id: "re-close", owner: "you", text: "Have the conversations & close the deals", how: "The relationship + terms are you." },
        ],
      },
      {
        id: "es-review", title: "Bring on a native Mexican-Spanish reviewer",
        why: "Authenticity with true locals — machine ES won’t win them.",
        subs: [
          { id: "esr-brief", owner: "claude", text: "Write the reviewer brief + where to find candidates", how: "I define the role and scope." },
          { id: "esr-hire", owner: "you", text: "Hire / assign the reviewer", how: "Your hire." },
        ],
      },
      {
        id: "shoots", title: "Plan the Local Picks photo/drone library",
        why: "Scale the original-media moat.",
        subs: [
          { id: "shoot-plan", owner: "claude", text: "Produce a shot list + schedule by location", how: "I plan the routes and shots." },
          { id: "shoot-do", owner: "you", text: "Do the shoots", how: "On the ground — you." },
        ],
      },
    ],
  },
  {
    key: "later", title: "Later", when: "3–6 months+", accent: P.green,
    blurb: "Scale the moat once traffic and content are compounding.",
    items: [
      {
        id: "itinerary", title: "AI itinerary builder",
        why: "The visitor conversion engine into bookable experiences.",
        subs: [
          { id: "itin-build", owner: "claude", text: "Build it end to end (retrieval-grounded on real rows)", how: "All me — never hallucinates venues." },
          { id: "itin-review", owner: "you", text: "Sanity-check the outputs", how: "You confirm quality." },
        ],
      },
      {
        id: "directory", title: "Light relocation directory (paid lane)",
        why: "The Phase-2 paid/lead-gen revenue tied to movers.",
        subs: [
          { id: "dir-build", owner: "claude", text: "Build the directory + admin flow", how: "Reuses the Local Picks infra — I build it." },
          { id: "dir-price", owner: "you", text: "Set pricing + approve listings", how: "Your business calls." },
        ],
      },
      {
        id: "automation", title: "Automate daily source crawls",
        why: "Freshness at scale without manual work.",
        subs: [
          { id: "auto-build", owner: "claude", text: "Build crawl → normalize → publish pipeline", how: "Fully automated by me." },
          { id: "auto-sources", owner: "you", text: "Approve the sources", how: "You OK the list." },
        ],
      },
      {
        id: "ebook", title: "Package the book as a paid PDF + capture",
        why: "Owned product; you keep 100% and the audience.",
        subs: [
          { id: "ebook-build", owner: "claude", text: "Assemble the PDF + email capture + delivery", how: "I format and build the whole funnel." },
          { id: "ebook-price", owner: "you", text: "Set the price + approve", how: "Your call." },
        ],
      },
      {
        id: "editorial", title: "Bring in editorial help",
        why: "When volume outgrows the family.",
        subs: [
          { id: "ed-recruit", owner: "you", text: "Recruit the help", how: "Your hire." },
          { id: "ed-onboard", owner: "claude", text: "Onboard them to the admin + voice guide", how: "I set them up." },
        ],
      },
    ],
  },
];

const STORAGE_KEY = "qp_checklist_v3";
const ALL_SUBS = SECTIONS.flatMap((s) => s.items.flatMap((i) => i.subs.map((x) => x.id)));
const DEFAULT_DONE = {
  "title-choose": true, "title-record": true, "voice-agree": true, "voice-capture": true,
  "ch4-draft": true, "ch4-deaiism": true, "chips-wrap": true,
};
const field = { width: "100%", padding: "9px 11px", borderRadius: 9, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", color: P.ink, background: "#fff", boxSizing: "border-box" };

export default function Checklist() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [done, setDone] = useState({});
  const [open, setOpen] = useState({});

  useEffect(() => {
    const saved = sessionStorage.getItem("qp_admin_pw");
    if (saved) { setPw(saved); setAuthed(true); }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw));
      else { setDone(DEFAULT_DONE); localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DONE)); }
    } catch { setDone(DEFAULT_DONE); }
  }, []);

  const toggleSub = (id) => setDone((d) => {
    const next = { ...d, [id]: !d[id] };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    return next;
  });
  const toggleOpen = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: P.plaster, display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "#fff", border: `1px solid ${P.line}`, borderRadius: 16, padding: 28, width: 320 }}>
          <h1 style={{ fontSize: 20, margin: "0 0 4px", color: P.ink }}>Vamos SMA — Checklist</h1>
          <p style={{ fontSize: 13, color: P.inkSoft, margin: "0 0 16px" }}>Enter the admin password.</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password"
            onKeyDown={(e) => { if (e.key === "Enter" && pw) { sessionStorage.setItem("qp_admin_pw", pw); setAuthed(true); } }}
            style={field} />
          <button onClick={() => { if (pw) { sessionStorage.setItem("qp_admin_pw", pw); setAuthed(true); } }}
            style={{ marginTop: 12, width: "100%", padding: 11, border: "none", borderRadius: 9, background: P.cobalt, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Enter
          </button>
        </div>
      </div>
    );
  }

  const totalDone = ALL_SUBS.filter((id) => done[id]).length;
  const pct = Math.round((totalDone / ALL_SUBS.length) * 100);

  return (
    <div style={{ minHeight: "100vh", background: P.plaster, color: P.ink, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 18px 70px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <Link href="/admin" style={{ color: P.cobalt, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Back to admin</Link>
          <Link href="/admin/roadmap" style={{ color: P.cobalt, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>📋 Roadmap</Link>
        </div>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 30, margin: "0 0 6px", letterSpacing: "-.01em" }}>Execution checklist</h1>
        <p style={{ color: P.inkSoft, margin: "0 0 6px", fontSize: 15 }}>Tap any item to expand its steps. Check off subtasks as you go — progress saves in this browser.</p>
        <p style={{ color: P.inkSoft, margin: "0 0 18px", fontSize: 13 }}>Wherever it says <strong style={{ color: P.rosa }}>🤖 Claude</strong>, I do the work. <strong style={{ color: P.cobalt }}>🧑 You</strong> marks the few steps only you can do (accounts, your identity, being on the ground).</p>

        <div style={{ background: "#fff", border: `1px solid ${P.line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            <span>Overall progress</span><span style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{totalDone}/{ALL_SUBS.length} steps · {pct}%</span>
          </div>
          <div style={{ height: 9, background: P.plaster, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${P.rosa}, ${P.marigold})`, transition: "width .25s" }} />
          </div>
        </div>

        {SECTIONS.map((sec) => {
          const secSubs = sec.items.flatMap((i) => i.subs.map((x) => x.id));
          const secDone = secSubs.filter((id) => done[id]).length;
          return (
            <section key={sec.key} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: sec.accent, boxShadow: `0 0 0 4px ${sec.accent}22` }} />
                <h2 style={{ fontFamily: "Georgia, serif", fontSize: 21, margin: 0 }}>{sec.title}</h2>
                <span style={{ color: P.inkSoft, fontSize: 13 }}>· {sec.when}</span>
                <span style={{ marginLeft: "auto", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: P.inkSoft }}>{secDone}/{secSubs.length}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {sec.items.map((it) => {
                  const subDone = it.subs.filter((s) => done[s.id]).length;
                  const complete = subDone === it.subs.length;
                  const isOpen = !!open[it.id];
                  const owners = [...new Set(it.subs.map((s) => s.owner))];
                  return (
                    <div key={it.id} style={{ background: "#fff", border: `1px solid ${complete ? sec.accent + "66" : P.line}`, borderRadius: 12, overflow: "hidden" }}>
                      <button onClick={() => toggleOpen(it.id)} style={{
                        width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer",
                        padding: "13px 15px", display: "grid", gridTemplateColumns: "18px 1fr auto", gap: 11, alignItems: "center",
                      }}>
                        <span style={{ fontSize: 12, color: P.inkSoft, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
                        <span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: P.ink, textDecoration: complete ? "line-through" : "none", opacity: complete ? 0.6 : 1 }}>
                            {complete ? "✓ " : ""}{it.title}
                          </span>
                          <span style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                            {owners.map((o) => (
                              <span key={o} style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: OWNER[o].soft, color: OWNER[o].color }}>
                                {OWNER[o].icon} {OWNER[o].label}
                              </span>
                            ))}
                          </span>
                        </span>
                        <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11.5, color: complete ? sec.accent : P.inkSoft, fontWeight: 700, whiteSpace: "nowrap" }}>
                          {subDone}/{it.subs.length}
                        </span>
                      </button>

                      {isOpen && (
                        <div style={{ padding: "0 15px 14px 44px", borderTop: `1px solid ${P.line}` }}>
                          <p style={{ fontSize: 13, color: P.inkSoft, fontStyle: "italic", margin: "12px 0 12px" }}>{it.why}</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {it.subs.map((s) => {
                              const o = OWNER[s.owner];
                              const dn = !!done[s.id];
                              return (
                                <label key={s.id} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 10, alignItems: "start", cursor: "pointer", opacity: dn ? 0.6 : 1 }}>
                                  <input type="checkbox" checked={dn} onChange={() => toggleSub(s.id)} style={{ width: 17, height: 17, marginTop: 2, accentColor: sec.accent, cursor: "pointer" }} />
                                  <span>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: P.ink, textDecoration: dn ? "line-through" : "none" }}>{s.text}</span>
                                    <span style={{ display: "block", fontSize: 12.5, color: P.inkSoft, marginTop: 2 }}>{s.how}</span>
                                  </span>
                                  <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: o.soft, color: o.color, whiteSpace: "nowrap" }}>
                                    {o.icon} {o.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <p style={{ color: P.inkSoft, fontSize: 12, marginTop: 30, paddingTop: 16, borderTop: `1px solid ${P.line}` }}>
          Progress is stored in this browser only (same device, same browser). It survives refreshes and closing the tab; it won’t sync to your phone until we add accounts. Ask Claude to add, re-word, or re-assign any step anytime.
        </p>
      </div>
    </div>
  );
}
