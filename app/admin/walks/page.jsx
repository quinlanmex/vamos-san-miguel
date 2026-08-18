"use client";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";

const P = { plaster: "#F7F1E5", card: "#FFFFFF", ink: "#0D1B36", inkSoft: "#6B6152", line: "#E7DDCB", coral: "#E06A63", green: "#3F8F6B", navy: "#15539A", chipBg: "#F0EADE", gold: "#B4791F" };
const btn = (bg, on = true) => ({ border: "none", cursor: on ? "pointer" : "default", background: on ? bg : P.inkSoft, color: "#fff", fontWeight: 700, fontSize: 13, padding: "7px 13px", borderRadius: 10 });

function stats(w) {
  const out = [];
  if (w.distance_m != null) { const km = w.distance_m / 1000; out.push(km < 1 ? `${Math.round(w.distance_m)} m` : `${km.toFixed(1)} km`); }
  if (w.elev_gain_m > 0) out.push(`↑ ${w.elev_gain_m} m`);
  out.push(`${(w.points || []).length} stops`);
  return out.join(" · ");
}

export default function WalksAdmin() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const api = useCallback(async (body) => {
    const r = await fetch("/api/walking-paths", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, ...body }) });
    const j = await r.json();
    if (!r.ok || j.ok === false) throw new Error(j.error || "Failed");
    return j;
  }, [pw]);

  const load = useCallback(async () => {
    try { const j = await api({ action: "list-admin" }); setItems(j.paths || []); setMsg(""); }
    catch (e) { setMsg(String(e.message || e)); }
  }, [api]);

  useEffect(() => { const s = sessionStorage.getItem("qp_admin_pw"); if (s) { setPw(s); setAuthed(true); } }, []);
  useEffect(() => { if (authed) load(); }, [authed, load]);

  async function toggleOfficial(w) {
    setBusy(true);
    try { await api({ action: "official", id: w.id, official: !w.official }); setItems((x) => x.map((i) => i.id === w.id ? { ...i, official: !i.official } : i)); }
    catch (e) { setMsg(String(e.message || e)); }
    setBusy(false);
  }
  async function del(w) {
    if (!confirm(`Delete "${w.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try { await api({ action: "delete", id: w.id }); setItems((x) => x.filter((i) => i.id !== w.id)); }
    catch (e) { setMsg(String(e.message || e)); }
    setBusy(false);
  }

  if (!authed) {
    return (
      <div style={{ background: P.plaster, minHeight: "100vh", padding: "60px 20px", fontFamily: "system-ui" }}>
        <div style={{ maxWidth: 340, margin: "0 auto", background: P.card, border: `1px solid ${P.line}`, borderRadius: 14, padding: 20 }}>
          <h1 style={{ fontSize: 18, margin: "0 0 12px", color: P.ink }}>Walks moderation</h1>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Admin password"
            onKeyDown={(e) => { if (e.key === "Enter") { sessionStorage.setItem("qp_admin_pw", pw); setAuthed(true); } }}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${P.line}`, fontSize: 14, marginBottom: 10 }} />
          <button onClick={() => { sessionStorage.setItem("qp_admin_pw", pw); setAuthed(true); }} style={btn(P.coral)}>Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: P.plaster, minHeight: "100vh", padding: "24px 20px", fontFamily: "system-ui", color: P.ink }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Link href="/admin" style={{ color: P.coral, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>← Back to admin</Link>
        <h1 style={{ fontSize: 26, fontFamily: "Georgia, serif", margin: "6px 0 6px" }}>Community walks</h1>
        <p style={{ fontSize: 13.5, color: P.inkSoft, margin: "0 0 16px" }}>Everyone's submitted walks. Mark the best ones "official" (they sort first with a badge), or delete junk.</p>
        {msg && <p style={{ color: P.coral, fontSize: 13.5 }}>{msg}</p>}
        {items.length === 0 ? <p style={{ color: P.inkSoft }}>No walks yet.</p> : (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {items.map((w) => (
              <div key={w.id} style={{ background: P.card, border: `1px solid ${w.official ? P.gold : P.line}`, borderRadius: 12, overflow: "hidden" }}>
                <img src={`/api/walk-map?id=${w.id}`} alt="" loading="lazy" style={{ width: "100%", height: 150, objectFit: "cover", display: "block", background: P.chipBg }} />
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong style={{ fontSize: 14.5 }}>{w.name}</strong>
                    {w.official && <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: P.gold, padding: "2px 7px", borderRadius: 999 }}>★ OFFICIAL</span>}
                  </div>
                  <p style={{ fontSize: 12, color: P.inkSoft, margin: "3px 0 8px" }}>{stats(w)}{w.author ? ` · by ${w.author}` : ""}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => toggleOfficial(w)} disabled={busy} style={btn(w.official ? P.inkSoft : P.gold, !busy)}>{w.official ? "Unmark" : "★ Official"}</button>
                    <button onClick={() => del(w)} disabled={busy} style={{ ...btn("transparent"), color: P.coral, border: `1px solid ${P.coral}55` }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
