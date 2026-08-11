"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const P = { navy: "#0D1B36", coral: "#E06A63", cream: "#F7F3EC", card: "#fff", ink: "#241C14", inkSoft: "#6E604F", line: "#E7DDCB", green: "#2F7A63" };
const CATS = [["musica", "Music"], ["cine", "Film"], ["tours", "Tours"], ["comunidad", "Community"], ["charlas", "Talks"], ["mercados", "Markets"], ["bienestar", "Wellness"]];
const LISTS = [["rest", "Restaurant / Café"], ["bar", "Bar / Cantina"], ["live", "Live music / Venue"]];
const AUD = [["family", "Family"], ["teens", "Teens"]];
const DIET = [["vegetarian", "Vegetarian"], ["vegan", "Vegan"]];
const STATUS = [["published", "Published"], ["draft", "Draft"], ["archived", "Archived"]];

const field = { width: "100%", padding: "9px 11px", borderRadius: 9, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", color: P.ink, background: "#fff", boxSizing: "border-box" };
const label = { fontSize: 12, fontWeight: 700, color: P.inkSoft, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4, display: "block" };
const chip = (on, c) => ({ padding: "6px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${on ? c : P.line}`, background: on ? c : "#fff", color: on ? "#fff" : P.inkSoft });
const btn = (bg, on = true) => ({ padding: "9px 15px", border: "none", borderRadius: 9, background: on ? bg : P.inkSoft, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: on ? "pointer" : "default" });

export default function Manage() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [kind, setKind] = useState("place");
  const [data, setData] = useState({ events: [], places: [] });
  const [editing, setEditing] = useState(null); // record or {} for new
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const api = useCallback(async (body) => {
    const r = await fetch("/api/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, ...body }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed");
    return j;
  }, [pw]);

  const load = useCallback(async () => {
    try { const j = await api({ action: "list" }); setData({ events: j.events, places: j.places }); }
    catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
  }, [api]);

  useEffect(() => {
    const s = sessionStorage.getItem("qp_admin_pw");
    if (s) { setPw(s); setAuthed(true); }
  }, []);
  useEffect(() => { if (authed) load(); }, [authed, load]);

  const upd = (k, v) => setEditing((e) => ({ ...e, [k]: v }));
  const toggle = (k, val) => setEditing((e) => { const s = new Set(e[k] || []); s.has(val) ? s.delete(val) : s.add(val); return { ...e, [k]: [...s] }; });

  async function save() {
    setBusy(true); setMsg(null);
    try {
      await api({ action: "save", kind, id: editing.id, record: editing });
      setEditing(null); await load(); setMsg({ type: "ok", text: "Saved." });
    } catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setBusy(false);
  }
  async function del(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusy(true); setMsg(null);
    try { await api({ action: "delete", kind, id }); await load(); setMsg({ type: "ok", text: "Deleted." }); }
    catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setBusy(false);
  }

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: P.cream, display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "#fff", border: `1px solid ${P.line}`, borderRadius: 16, padding: 28, width: 320 }}>
          <h1 style={{ fontSize: 20, margin: "0 0 4px", color: P.ink }}>Manage content</h1>
          <p style={{ fontSize: 13, color: P.inkSoft, margin: "0 0 16px" }}>Enter the admin password.</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" style={field}
            onKeyDown={(e) => { if (e.key === "Enter" && pw) { sessionStorage.setItem("qp_admin_pw", pw); setAuthed(true); } }} />
          <button onClick={() => { if (pw) { sessionStorage.setItem("qp_admin_pw", pw); setAuthed(true); } }} style={{ ...btn(P.navy), marginTop: 12, width: "100%" }}>Enter</button>
        </div>
      </div>
    );
  }

  const rows = kind === "event" ? data.events : data.places;
  const isPlace = kind === "place";

  return (
    <div style={{ minHeight: "100vh", background: P.cream, color: P.ink, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "22px 18px 70px" }}>
        <Link href="/admin" style={{ color: P.navy, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Back to admin</Link>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, margin: "12px 0 14px" }}>Manage content</h1>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[["place", "Local Picks"], ["event", "Events"]].map(([k, lbl]) => (
            <button key={k} onClick={() => { setKind(k); setEditing(null); }}
              style={{ border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, padding: "8px 4px", marginRight: 14, background: "transparent",
                color: kind === k ? P.ink : P.inkSoft, borderBottom: kind === k ? `3px solid ${P.coral}` : "3px solid transparent" }}>
              {lbl} <span style={{ color: P.inkSoft, fontWeight: 600 }}>({k === "event" ? data.events.length : data.places.length})</span>
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ marginBottom: 14, padding: "9px 13px", borderRadius: 9, fontSize: 13.5, background: msg.type === "ok" ? "#E7F4EE" : "#FBE7EF", color: msg.type === "ok" ? P.green : P.coral, border: `1px solid ${msg.type === "ok" ? P.green : P.coral}44` }}>{msg.text}</div>
        )}

        {!editing && (
          <>
            <button onClick={() => setEditing(isPlace ? { list_key: "rest", category: "mercados", audience: [], diet: [], status: "published" } : { category: "musica", audience: [], status: "published", recurring: false })}
              style={{ ...btn(P.coral), marginBottom: 14 }}>+ Add {isPlace ? "a Local Pick" : "an event"} manually</button>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((r) => (
                <div key={r.id} style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 11, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{isPlace ? r.name : (r.title_en || r.title_es)}</div>
                    <div style={{ fontSize: 12, color: P.inkSoft }}>{r.category}{isPlace ? ` · ${r.list_key || ""}` : (r.start_date ? ` · ${r.start_date}` : "")} · {r.status}</div>
                  </div>
                  <button onClick={() => setEditing({ ...r, audience: r.audience || [], diet: r.diet || [] })} style={btn(P.navy)}>Edit</button>
                  <button onClick={() => del(r.id, isPlace ? r.name : (r.title_en || r.title_es))} style={{ ...btn("transparent"), color: P.coral, border: `1px solid ${P.coral}55` }}>Delete</button>
                </div>
              ))}
              {rows.length === 0 && <p style={{ color: P.inkSoft, fontSize: 14 }}>Nothing here yet. Add one above.</p>}
            </div>
          </>
        )}

        {editing && (
          <div style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 16, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, margin: 0 }}>{editing.id ? "Edit" : "New"} {isPlace ? "Local Pick" : "event"}</h2>
              <button onClick={() => setEditing(null)} style={{ border: "none", background: "transparent", color: P.inkSoft, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {isPlace ? (
                <>
                  <div style={{ gridColumn: "1 / -1" }}><label style={label}>Name</label><input style={field} value={editing.name || ""} onChange={(e) => upd("name", e.target.value)} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={label}>Description (EN)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={editing.desc_en || ""} onChange={(e) => upd("desc_en", e.target.value)} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={label}>Descripción (ES)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={editing.desc_es || ""} onChange={(e) => upd("desc_es", e.target.value)} /></div>
                  <div><label style={label}>List</label><select style={field} value={editing.list_key || ""} onChange={(e) => upd("list_key", e.target.value)}>{LISTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                  <div><label style={label}>Category</label><select style={field} value={editing.category || ""} onChange={(e) => upd("category", e.target.value)}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                  <div><label style={label}>Audience</label><div style={{ display: "flex", gap: 8, paddingTop: 4 }}>{AUD.map(([k, l]) => <button key={k} onClick={() => toggle("audience", k)} style={chip((editing.audience || []).includes(k), P.navy)}>{l}</button>)}</div></div>
                  <div><label style={label}>Dietary</label><div style={{ display: "flex", gap: 8, paddingTop: 4 }}>{DIET.map(([k, l]) => <button key={k} onClick={() => toggle("diet", k)} style={chip((editing.diet || []).includes(k), P.green)}>{l}</button>)}</div></div>
                  <div><label style={label}>Area</label><input style={field} value={editing.area || ""} onChange={(e) => upd("area", e.target.value)} /></div>
                  <div><label style={label}>Website</label><input style={field} value={editing.origin_url || ""} onChange={(e) => upd("origin_url", e.target.value)} /></div>
                </>
              ) : (
                <>
                  <div><label style={label}>Title (EN)</label><input style={field} value={editing.title_en || ""} onChange={(e) => upd("title_en", e.target.value)} /></div>
                  <div><label style={label}>Título (ES)</label><input style={field} value={editing.title_es || ""} onChange={(e) => upd("title_es", e.target.value)} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={label}>Blurb (EN)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={editing.blurb_en || ""} onChange={(e) => upd("blurb_en", e.target.value)} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={label}>Descripción (ES)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={editing.blurb_es || ""} onChange={(e) => upd("blurb_es", e.target.value)} /></div>
                  <div><label style={label}>Category</label><select style={field} value={editing.category || ""} onChange={(e) => upd("category", e.target.value)}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                  <div><label style={label}>Audience</label><div style={{ display: "flex", gap: 8, paddingTop: 4 }}>{AUD.map(([k, l]) => <button key={k} onClick={() => toggle("audience", k)} style={chip((editing.audience || []).includes(k), P.navy)}>{l}</button>)}</div></div>
                  <div><label style={label}>Start date</label><input type="date" style={field} value={editing.start_date || ""} onChange={(e) => upd("start_date", e.target.value)} /></div>
                  <div><label style={label}>End date</label><input type="date" style={field} value={editing.end_date || ""} onChange={(e) => upd("end_date", e.target.value)} /></div>
                  <div><label style={label}>Time</label><input placeholder="19:00" style={field} value={editing.start_time || ""} onChange={(e) => upd("start_time", e.target.value)} /></div>
                  <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}><label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, cursor: "pointer" }}><input type="checkbox" checked={!!editing.recurring} onChange={(e) => upd("recurring", e.target.checked)} /> Recurring</label></div>
                  <div><label style={label}>Price (EN)</label><input style={field} value={editing.price_en || ""} onChange={(e) => upd("price_en", e.target.value)} /></div>
                  <div><label style={label}>Venue</label><input style={field} value={editing.venue || ""} onChange={(e) => upd("venue", e.target.value)} /></div>
                  <div><label style={label}>Area</label><input style={field} value={editing.area || ""} onChange={(e) => upd("area", e.target.value)} /></div>
                  <div><label style={label}>Source URL</label><input style={field} value={editing.origin_url || ""} onChange={(e) => upd("origin_url", e.target.value)} /></div>
                </>
              )}
              <div><label style={label}>Photo URL</label><input style={field} value={editing.photo_url || ""} onChange={(e) => upd("photo_url", e.target.value)} placeholder="https://…" /></div>
              <div><label style={label}>Status</label><select style={field} value={editing.status || "published"} onChange={(e) => upd("status", e.target.value)}>{STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            </div>
            <button onClick={save} disabled={busy} style={{ ...btn(P.coral, !busy), marginTop: 16, width: "100%", padding: 13, fontSize: 15 }}>{busy ? "Saving…" : "Save"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
