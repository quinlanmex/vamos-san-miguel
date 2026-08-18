"use client";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";

const P = { plaster: "#F7F1E5", card: "#FFFFFF", ink: "#0D1B36", inkSoft: "#6B6152", line: "#E7DDCB", coral: "#E06A63", green: "#3F8F6B", navy: "#15539A", chipBg: "#F0EADE" };
const btn = (bg, on = true) => ({ border: "none", cursor: on ? "pointer" : "default", background: on ? bg : P.inkSoft, color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "8px 14px", borderRadius: 10 });

export default function PhotosAdmin() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const api = useCallback(async (body) => {
    const r = await fetch("/api/photo-candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, ...body }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed");
    return j;
  }, [pw]);

  const load = useCallback(async (st) => {
    try { const j = await api({ action: "list", status: st }); setItems(j.items || []); setMsg(""); }
    catch (e) { setMsg(String(e.message || e)); }
  }, [api]);

  useEffect(() => { const s = sessionStorage.getItem("qp_admin_pw"); if (s) { setPw(s); setAuthed(true); } }, []);
  useEffect(() => { if (authed) load(status); }, [authed, status, load]);

  async function act(id, action) {
    setBusy(true);
    try { await api({ action, id }); setItems((x) => x.filter((i) => i.id !== id)); }
    catch (e) { setMsg(String(e.message || e)); }
    setBusy(false);
  }

  if (!authed) {
    return (
      <div style={{ background: P.plaster, minHeight: "100vh", padding: "60px 20px", fontFamily: "system-ui" }}>
        <div style={{ maxWidth: 340, margin: "0 auto", background: P.card, border: `1px solid ${P.line}`, borderRadius: 14, padding: 20 }}>
          <h1 style={{ fontSize: 18, margin: "0 0 12px", color: P.ink }}>Photo review</h1>
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
        <h1 style={{ fontSize: 26, fontFamily: "Georgia, serif", margin: "6px 0 14px" }}>Photo review queue</h1>
        <p style={{ fontSize: 13.5, color: P.inkSoft, margin: "0 0 16px", maxWidth: "62ch" }}>
          Photos scanned from your Dropbox folder that the vision pass judged to be San Miguel and free of people. Approve the ones you want to keep; reject removes the file.
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[["pending", "Pending"], ["approved", "Approved"]].map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} style={{ ...btn(status === k ? P.navy : P.chipBg), color: status === k ? "#fff" : P.inkSoft, background: status === k ? P.navy : P.chipBg }}>{l}</button>
          ))}
        </div>
        {msg && <p style={{ color: P.coral, fontSize: 13.5 }}>{msg}</p>}
        {items.length === 0 ? (
          <p style={{ color: P.inkSoft }}>Nothing here. Run <code>node scripts/scan-photos.mjs &lt;folder&gt;</code> to populate the queue.</p>
        ) : (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {items.map((it) => (
              <div key={it.id} style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 12, overflow: "hidden" }}>
                <img src={it.url} alt="" loading="lazy" style={{ width: "100%", height: 180, objectFit: "cover", display: "block", background: P.chipBg }} />
                <div style={{ padding: "10px 12px" }}>
                  <p style={{ fontSize: 13, color: P.ink, margin: "0 0 4px", lineHeight: 1.4 }}>{it.caption}</p>
                  {it.tags?.length > 0 && <p style={{ fontSize: 11, color: P.inkSoft, margin: "0 0 8px" }}>{it.tags.join(" · ")}</p>}
                  {status === "pending" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => act(it.id, "approve")} disabled={busy} style={btn(P.green, !busy)}>Approve</button>
                      <button onClick={() => act(it.id, "reject")} disabled={busy} style={{ ...btn("transparent"), color: P.coral, border: `1px solid ${P.coral}55` }}>Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
