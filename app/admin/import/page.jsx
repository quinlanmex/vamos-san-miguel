"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const P = { navy: "#0D1B36", coral: "#E06A63", cream: "#F7F3EC", ink: "#241C14", inkSoft: "#6E604F", line: "#E7DDCB", green: "#2F7A63" };
const field = { width: "100%", padding: "9px 11px", borderRadius: 9, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", color: P.ink, background: "#fff", boxSizing: "border-box" };
const btn = (bg, on = true) => ({ padding: "11px 18px", border: "none", borderRadius: 10, background: on ? bg : P.inkSoft, color: "#fff", fontWeight: 700, fontSize: 14, cursor: on ? "pointer" : "default" });

export default function ImportPicks() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dry, setDry] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const s = sessionStorage.getItem("qp_admin_pw");
    if (s) { setPw(s); setAuthed(true); }
  }, []);

  async function run(mode) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/import-picks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, mode }) });
      const j = await r.json();
      if (!r.ok) { setMsg({ type: "err", text: j.error || "Failed" }); }
      else if (mode === "dryrun") { setDry(j); }
      else { setMsg({ type: "ok", text: `Published ${j.inserted} pick(s). ${j.skipped ? j.skipped + " already existed and were skipped." : ""}${j.error ? " Error: " + j.error : ""}` }); setDry(null); }
    } catch (e) { setMsg({ type: "err", text: String(e) }); }
    setBusy(false);
  }

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: P.cream, display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "#fff", border: `1px solid ${P.line}`, borderRadius: 16, padding: 28, width: 320 }}>
          <h1 style={{ fontSize: 20, margin: "0 0 4px", color: P.ink }}>Import Local Picks</h1>
          <p style={{ fontSize: 13, color: P.inkSoft, margin: "0 0 16px" }}>Enter the admin password.</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" style={field}
            onKeyDown={(e) => { if (e.key === "Enter" && pw) { sessionStorage.setItem("qp_admin_pw", pw); setAuthed(true); } }} />
          <button onClick={() => { if (pw) { sessionStorage.setItem("qp_admin_pw", pw); setAuthed(true); } }} style={{ ...btn(P.navy), marginTop: 12, width: "100%" }}>Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: P.cream, color: P.ink, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "22px 18px 70px" }}>
        <Link href="/admin" style={{ color: P.navy, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Back to admin</Link>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, margin: "12px 0 4px" }}>Import your Local Picks</h1>
        <p style={{ color: P.inkSoft, fontSize: 15, margin: "0 0 20px", maxWidth: "62ch" }}>
          This looks up each of your 55 candidate places in Google Places, confirms it's in the greater–San Miguel area, grabs a photo, and tags it.
          Run the <strong>preview</strong> first, review the list, then publish. Nothing is written until you click publish.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => run("dryrun")} disabled={busy} style={btn(P.navy, !busy)}>{busy ? "Working… (may take ~30–60s)" : "1 · Preview import (dry run)"}</button>
          {dry && <button onClick={() => run("commit")} disabled={busy} style={btn(P.coral, !busy)}>2 · Publish {dry.willImport} picks</button>}
        </div>

        {msg && (
          <div style={{ marginTop: 16, padding: "11px 14px", borderRadius: 10, fontSize: 14,
            background: msg.type === "ok" ? "#E7F4EE" : "#FBE7EF", color: msg.type === "ok" ? P.green : P.coral, border: `1px solid ${msg.type === "ok" ? P.green : P.coral}44` }}>
            {msg.text}
          </div>
        )}

        {dry && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>
              {dry.willImport} of {dry.total} will import (matched + in-area). Review below, then publish.
            </p>
            <div style={{ overflowX: "auto", border: `1px solid ${P.line}`, borderRadius: 12, background: "#fff" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560, fontSize: 13 }}>
                <thead>
                  <tr style={{ background: P.cream }}>
                    {["Place", "Import?", "Matched address", "km", "Photo"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "9px 12px", borderBottom: `1px solid ${P.line}`, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: P.inkSoft }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dry.preview.map((r, i) => {
                    const ok = r.matched && r.inArea;
                    return (
                      <tr key={i} style={{ opacity: ok ? 1 : 0.5 }}>
                        <td style={{ padding: "8px 12px", borderBottom: `1px solid ${P.line}`, fontWeight: 600 }}>{r.name}</td>
                        <td style={{ padding: "8px 12px", borderBottom: `1px solid ${P.line}` }}>
                          {ok ? <span style={{ color: P.green, fontWeight: 700 }}>✓ yes</span>
                            : <span style={{ color: P.inkSoft }}>{!r.matched ? (r.error ? "error" : "no match") : "out of area"}</span>}
                        </td>
                        <td style={{ padding: "8px 12px", borderBottom: `1px solid ${P.line}`, color: P.inkSoft }}>{r.address || "—"}</td>
                        <td style={{ padding: "8px 12px", borderBottom: `1px solid ${P.line}`, color: P.inkSoft, whiteSpace: "nowrap" }}>{r.km != null ? r.km : "—"}</td>
                        <td style={{ padding: "8px 12px", borderBottom: `1px solid ${P.line}` }}>{r.photo ? "📷" : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
