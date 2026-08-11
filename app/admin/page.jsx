"use client";
import { useState, useEffect } from "react";

const P = { plaster: "#FAF6EF", card: "#fff", ink: "#2A211A", inkSoft: "#6B5D4F", cobalt: "#15539A", rosa: "#E11D74", marigold: "#F2A100", line: "#EAE2D4", green: "#2F7A63" };
const CATS = [["musica","Music"],["cine","Film"],["tours","Tours"],["comunidad","Community"],["charlas","Talks"],["mercados","Markets"],["bienestar","Wellness"]];
const LISTS = [["rest","Restaurant / Café"],["bar","Bar / Cantina"],["live","Live music / Venue"]];
const AUD = [["family","Family"],["teens","Teens"]];
const DIET = [["vegetarian","Vegetarian"],["vegan","Vegan"]];

const field = { width: "100%", padding: "9px 11px", borderRadius: 9, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", color: P.ink, background: "#fff", boxSizing: "border-box" };
const label = { fontSize: 12, fontWeight: 700, color: P.inkSoft, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4, display: "block" };
const chip = (on, color) => ({ padding: "7px 13px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${on ? color : P.line}`, background: on ? color : "#fff", color: on ? "#fff" : P.inkSoft });

export default function Admin() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [kind, setKind] = useState("event"); // "event" | "place"
  const [source, setSource] = useState("");
  const [raw, setRaw] = useState("");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("qp_admin_pw");
    if (saved) { setPw(saved); setAuthed(true); }
  }, []);

  const upd = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const toggleIn = (k, val) => setDraft((d) => {
    const set = new Set(d[k] || []);
    set.has(val) ? set.delete(val) : set.add(val);
    return { ...d, [k]: [...set] };
  });
  const switchKind = (k) => { setKind(k); setDraft(null); setMsg(null); };

  async function normalize() {
    setBusy(true); setMsg(null); setDraft(null);
    try {
      const r = await fetch("/api/normalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: raw, password: pw, kind }) });
      const j = await r.json();
      if (!r.ok) setMsg({ type: "err", text: j.error || "Failed" });
      else setDraft(j.record);
    } catch (e) { setMsg({ type: "err", text: String(e) }); }
    setBusy(false);
  }

  async function publish() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ record: draft, password: pw, kind, discovered_via: source || "paste" }) });
      const j = await r.json();
      if (!r.ok) setMsg({ type: "err", text: j.error || "Failed" });
      else { setMsg({ type: "ok", text: `Published ✓ (id ${j.id.slice(0, 8)}…). It's live on the site.` }); setDraft(null); setRaw(""); }
    } catch (e) { setMsg({ type: "err", text: String(e) }); }
    setBusy(false);
  }

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: P.plaster, display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "#fff", border: `1px solid ${P.line}`, borderRadius: 16, padding: 28, width: 320 }}>
          <h1 style={{ fontSize: 20, margin: "0 0 4px", color: P.ink }}>Vamos SMA — Admin</h1>
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

  const isPlace = kind === "place";

  return (
    <div style={{ minHeight: "100vh", background: P.plaster, color: P.ink, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 18px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Vamos SMA — Admin</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="/admin/roadmap" style={{ color: P.cobalt, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>📋 Roadmap</a>
            <a href="/admin/checklist" style={{ color: P.cobalt, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>✅ Checklist</a>
            <a href="/admin/import" style={{ color: P.cobalt, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>📥 Import picks</a>
            <a href="/admin/manage" style={{ color: P.cobalt, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>🗂 Manage</a>
            <button onClick={() => { sessionStorage.removeItem("qp_admin_pw"); setAuthed(false); }}
              style={{ border: "none", background: "transparent", color: P.inkSoft, fontSize: 13, cursor: "pointer" }}>Sign out</button>
          </div>
        </div>

        {/* Event / Local Pick toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[["event", "Add an event"], ["place", "Add a Local Pick"]].map(([k, lbl]) => (
            <button key={k} onClick={() => switchKind(k)}
              style={{ border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, padding: "8px 4px", marginRight: 12,
                background: "transparent", color: kind === k ? P.ink : P.inkSoft,
                borderBottom: kind === k ? `3px solid ${P.rosa}` : "3px solid transparent" }}>
              {lbl}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 13.5, color: P.inkSoft, marginTop: 0 }}>
          {isPlace
            ? "Paste a description, review, or your own notes about a restaurant, bar, or venue. Claude turns it into a clean bilingual Local Pick — review, then publish."
            : "Paste a Facebook post, newsletter, or flyer text. Claude turns it into a clean bilingual event — review, then publish."}
        </p>

        {!isPlace && (
          <div style={{ marginTop: 12 }}>
            <label style={label}>Discovered via (internal note, not shown publicly)</label>
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. discoversma, Biblioteca FB" style={field} />
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <label style={label}>Raw text</label>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={8}
            placeholder={isPlace ? "e.g. La Parada — beloved Peruvian spot with a leafy courtyard in Centro. Great ceviche, veggie options, casual." : "Paste the event text here…"}
            style={{ ...field, resize: "vertical", lineHeight: 1.5 }} />
        </div>

        <button onClick={normalize} disabled={busy || !raw.trim()}
          style={{ marginTop: 12, padding: "11px 18px", border: "none", borderRadius: 10, background: busy ? P.inkSoft : P.cobalt, color: "#fff", fontWeight: 700, fontSize: 14, cursor: busy ? "default" : "pointer" }}>
          {busy ? "Working…" : "Normalize with Claude"}
        </button>

        {msg && (
          <div style={{ marginTop: 14, padding: "10px 13px", borderRadius: 10, fontSize: 13.5,
            background: msg.type === "ok" ? "#E7F4EE" : "#FBE7EF", color: msg.type === "ok" ? P.green : P.rosa, border: `1px solid ${msg.type === "ok" ? P.green : P.rosa}33` }}>
            {msg.text}
          </div>
        )}

        {draft && (
          <div style={{ marginTop: 20, background: "#fff", border: `1px solid ${P.line}`, borderRadius: 16, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, margin: 0 }}>Review draft</h2>
              <span style={{ fontSize: 12, fontWeight: 700, color: draft.confidence === "high" ? P.green : draft.confidence === "low" ? P.rosa : P.marigold }}>
                confidence: {draft.confidence}
              </span>
            </div>

            {isPlace ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ gridColumn: "1 / -1" }}><label style={label}>Name</label><input style={field} value={draft.name || ""} onChange={(e) => upd("name", e.target.value)} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={label}>Description (EN)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={draft.desc_en || ""} onChange={(e) => upd("desc_en", e.target.value)} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={label}>Descripción (ES)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={draft.desc_es || ""} onChange={(e) => upd("desc_es", e.target.value)} /></div>
                <div>
                  <label style={label}>List</label>
                  <select style={field} value={draft.list_key || ""} onChange={(e) => upd("list_key", e.target.value)}>
                    {LISTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Category</label>
                  <select style={field} value={draft.category || ""} onChange={(e) => upd("category", e.target.value)}>
                    {CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Audience</label>
                  <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                    {AUD.map(([k, l]) => <button key={k} onClick={() => toggleIn("audience", k)} style={chip((draft.audience || []).includes(k), P.cobalt)}>{l}</button>)}
                  </div>
                </div>
                <div>
                  <label style={label}>Dietary</label>
                  <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                    {DIET.map(([k, l]) => <button key={k} onClick={() => toggleIn("diet", k)} style={chip((draft.diet || []).includes(k), P.green)}>{l}</button>)}
                  </div>
                </div>
                <div><label style={label}>Area</label><input style={field} value={draft.area || ""} onChange={(e) => upd("area", e.target.value)} /></div>
                <div><label style={label}>Website (optional)</label><input style={field} value={draft.origin_url || ""} onChange={(e) => upd("origin_url", e.target.value)} placeholder="https://…" /></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={label}>Photo URL (optional)</label><input style={field} value={draft.photo_url || ""} onChange={(e) => upd("photo_url", e.target.value)} placeholder="https://…" /></div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={label}>Title (EN)</label><input style={field} value={draft.title_en || ""} onChange={(e) => upd("title_en", e.target.value)} /></div>
                <div><label style={label}>Título (ES)</label><input style={field} value={draft.title_es || ""} onChange={(e) => upd("title_es", e.target.value)} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={label}>Blurb (EN)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={draft.blurb_en || ""} onChange={(e) => upd("blurb_en", e.target.value)} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={label}>Descripción (ES)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={draft.blurb_es || ""} onChange={(e) => upd("blurb_es", e.target.value)} /></div>
                <div>
                  <label style={label}>Category</label>
                  <select style={field} value={draft.category || ""} onChange={(e) => upd("category", e.target.value)}>
                    {CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Audience</label>
                  <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                    {AUD.map(([k, l]) => <button key={k} onClick={() => toggleIn("audience", k)} style={chip((draft.audience || []).includes(k), P.cobalt)}>{l}</button>)}
                  </div>
                </div>
                <div><label style={label}>Start date</label><input style={field} type="date" value={draft.start_date || ""} onChange={(e) => upd("start_date", e.target.value)} /></div>
                <div><label style={label}>End date</label><input style={field} type="date" value={draft.end_date || ""} onChange={(e) => upd("end_date", e.target.value)} /></div>
                <div><label style={label}>Time (24h)</label><input style={field} placeholder="19:00" value={draft.start_time || ""} onChange={(e) => upd("start_time", e.target.value)} /></div>
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!draft.recurring} onChange={(e) => upd("recurring", e.target.checked)} /> Recurring
                  </label>
                </div>
                <div><label style={label}>Price (EN)</label><input style={field} value={draft.price_en || ""} onChange={(e) => upd("price_en", e.target.value)} /></div>
                <div><label style={label}>Precio (ES)</label><input style={field} value={draft.price_es || ""} onChange={(e) => upd("price_es", e.target.value)} /></div>
                <div><label style={label}>Venue</label><input style={field} value={draft.venue || ""} onChange={(e) => upd("venue", e.target.value)} /></div>
                <div><label style={label}>Area</label><input style={field} value={draft.area || ""} onChange={(e) => upd("area", e.target.value)} /></div>
                <div><label style={label}>Source name</label><input style={field} value={draft.origin_name || ""} onChange={(e) => upd("origin_name", e.target.value)} /></div>
                <div><label style={label}>Source URL</label><input style={field} value={draft.origin_url || ""} onChange={(e) => upd("origin_url", e.target.value)} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={label}>Photo URL (optional)</label><input style={field} value={draft.photo_url || ""} onChange={(e) => upd("photo_url", e.target.value)} placeholder="https://…" /></div>
              </div>
            )}

            <button onClick={publish} disabled={busy}
              style={{ marginTop: 16, width: "100%", padding: 13, border: "none", borderRadius: 10, background: busy ? P.inkSoft : P.rosa, color: "#fff", fontWeight: 700, fontSize: 15, cursor: busy ? "default" : "pointer" }}>
              {busy ? "Publishing…" : isPlace ? "Publish Local Pick" : "Publish to the site"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
