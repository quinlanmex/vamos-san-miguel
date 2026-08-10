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

const SECTIONS = [
  {
    key: "now", title: "Now", when: "the next few weeks", accent: P.rosa,
    blurb: "Start earning and stand up the first content. Nothing here waits on the full book.",
    items: [
      { id: "title", owner: "you", text: "Lock the book title & subtitle", note: "Leaning: “The Geography of a Richer Life.”" },
      { id: "aff-viator", owner: "you", text: "Sign up: Viator + GetYourGuide (tours & experiences)", note: "Feeds the itinerary builder." },
      { id: "aff-booking", owner: "you", text: "Sign up: Booking.com affiliate (hotels & stays)" },
      { id: "aff-wise", owner: "you", text: "Sign up: Wise affiliate (USD→MXN transfers)" },
      { id: "aff-sw", owner: "you", text: "Sign up: SafetyWing (travel + expat health cover)" },
      { id: "photos", owner: "you", text: "Gather first batch of original photos / drone shots", note: "For the launch set of Local Picks." },
      { id: "ch4", owner: "claude", text: "Rewrite Book Ch 4 (taxes) — facts-only, house voice", note: "Delivered as book/ch4.md for your review." },
      { id: "voice", owner: "claude", text: "Lock the house-voice style guide", note: "Approved — captured." },
      { id: "plan-scaffold", owner: "claude", text: "Build the “Plan Your Trip” section scaffold + page template" },
      { id: "picks5", owner: "both", text: "Choose the first 5 Local Picks to feature with your media" },
      { id: "ch4-review", owner: "both", text: "Review the Ch 4 rewrite together, set the neutrality bar" },
    ],
  },
  {
    key: "next", title: "Next", when: "1–3 months", accent: P.cobalt,
    blurb: "Convert the book, run the SEO/GEO pass, and turn on the higher-value affiliate pages.",
    items: [
      { id: "book-convert", owner: "claude", text: "Rewrite & convert Ch 5–23 into clustered pages" },
      { id: "seo", owner: "claude", text: "SEO/GEO pass: server-render, schema.org, sitemap, llms.txt, hreflang" },
      { id: "aff-pages", owner: "claude", text: "Build healthcare/insurance + housing affiliate pages" },
      { id: "es-parity", owner: "claude", text: "Spanish parity on the top-traffic pages" },
      { id: "re-deals", owner: "you", text: "Line up real-estate + immigration referral deals (local, direct)" },
      { id: "es-review", owner: "you", text: "Source a native Mexican-Spanish reviewer for top pages" },
      { id: "shoots", owner: "both", text: "Plan photo & drone shoots for the Local Picks library" },
    ],
  },
  {
    key: "later", title: "Later", when: "3–6 months+", accent: P.green,
    blurb: "Scale the moat once traffic and content are compounding.",
    items: [
      { id: "itinerary", owner: "claude", text: "AI itinerary builder (retrieval-grounded, real rows only)" },
      { id: "directory", owner: "claude", text: "Light relocation directory — the paid / lead-gen lane" },
      { id: "automation", owner: "claude", text: "Automate daily source crawls → normalize → publish" },
      { id: "ebook", owner: "both", text: "Package the finished book as a paid PDF behind email capture" },
      { id: "editorial", owner: "you", text: "Bring in editorial help as volume grows" },
    ],
  },
];

const STORAGE_KEY = "qp_checklist_v1";
const field = { width: "100%", padding: "9px 11px", borderRadius: 9, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", color: P.ink, background: "#fff", boxSizing: "border-box" };
const ALL_IDS = SECTIONS.flatMap((s) => s.items.map((i) => i.id));

export default function Checklist() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [done, setDone] = useState({});

  useEffect(() => {
    const saved = sessionStorage.getItem("qp_admin_pw");
    if (saved) { setPw(saved); setAuthed(true); }
    try { setDone(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")); } catch { setDone({}); }
  }, []);

  const toggle = (id) => setDone((d) => {
    const next = { ...d, [id]: !d[id] };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    return next;
  });

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

  const totalDone = ALL_IDS.filter((id) => done[id]).length;
  const pct = Math.round((totalDone / ALL_IDS.length) * 100);

  return (
    <div style={{ minHeight: "100vh", background: P.plaster, color: P.ink, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 18px 70px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <Link href="/admin" style={{ color: P.cobalt, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Back to admin</Link>
          <Link href="/admin/roadmap" style={{ color: P.cobalt, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>📋 Roadmap</Link>
        </div>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 30, margin: "0 0 6px", letterSpacing: "-.01em" }}>Execution checklist</h1>
        <p style={{ color: P.inkSoft, margin: "0 0 18px", fontSize: 15 }}>Exactly what each of us does to fulfill the roadmap. Checks save on this device.</p>

        {/* overall progress */}
        <div style={{ background: "#fff", border: `1px solid ${P.line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            <span>Overall progress</span><span style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{totalDone}/{ALL_IDS.length} · {pct}%</span>
          </div>
          <div style={{ height: 9, background: P.plaster, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${P.rosa}, ${P.marigold})`, transition: "width .25s" }} />
          </div>
        </div>

        {/* legend */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
          {Object.values(OWNER).map((o) => (
            <span key={o.label} style={{ fontSize: 12.5, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: o.soft, color: o.color }}>
              {o.icon} {o.label}
            </span>
          ))}
        </div>

        {SECTIONS.map((sec) => {
          const secDone = sec.items.filter((i) => done[i.id]).length;
          return (
            <section key={sec.key} style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: sec.accent, boxShadow: `0 0 0 4px ${sec.accent}22` }} />
                <h2 style={{ fontFamily: "Georgia, serif", fontSize: 21, margin: 0 }}>{sec.title}</h2>
                <span style={{ color: P.inkSoft, fontSize: 13 }}>· {sec.when}</span>
                <span style={{ marginLeft: "auto", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: P.inkSoft }}>{secDone}/{sec.items.length}</span>
              </div>
              <p style={{ color: P.inkSoft, fontSize: 13.5, margin: "0 0 12px 20px" }}>{sec.blurb}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sec.items.map((it) => {
                  const o = OWNER[it.owner];
                  const isDone = !!done[it.id];
                  return (
                    <label key={it.id} style={{
                      display: "grid", gridTemplateColumns: "22px 1fr auto", gap: 12, alignItems: "start",
                      background: "#fff", border: `1px solid ${isDone ? P.line : P.line}`, borderRadius: 12, padding: "12px 14px",
                      cursor: "pointer", opacity: isDone ? 0.62 : 1, transition: "opacity .15s",
                    }}>
                      <input type="checkbox" checked={isDone} onChange={() => toggle(it.id)}
                        style={{ width: 18, height: 18, marginTop: 2, accentColor: sec.accent, cursor: "pointer" }} />
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 600, textDecoration: isDone ? "line-through" : "none", color: P.ink }}>{it.text}</div>
                        {it.note && <div style={{ fontSize: 12.5, color: P.inkSoft, marginTop: 2 }}>{it.note}</div>}
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: o.soft, color: o.color, whiteSpace: "nowrap" }}>
                        {o.icon} {o.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}

        <p style={{ color: P.inkSoft, fontSize: 12, marginTop: 30, paddingTop: 16, borderTop: `1px solid ${P.line}` }}>
          Progress is stored in this browser only. Ask Claude to add, re-word, or re-assign items anytime.
        </p>
      </div>
    </div>
  );
}
