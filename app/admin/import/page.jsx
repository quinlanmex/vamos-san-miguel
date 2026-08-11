"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const P = { navy: "#0D1B36", coral: "#E06A63", cream: "#F7F3EC", ink: "#241C14", inkSoft: "#6E604F", line: "#E7DDCB", green: "#2F7A63" };
const field = { width: "100%", padding: "9px 11px", borderRadius: 9, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", color: P.ink, background: "#fff", boxSizing: "border-box" };
const btn = (bg, on = true) => ({ padding: "11px 18px", border: "none", borderRadius: 10, background: on ? bg : P.inkSoft, color: "#fff", fontWeight: 700, fontSize: 14, cursor: on ? "pointer" : "default" });
const th = { textAlign: "left", padding: "9px 12px", borderBottom: `1px solid ${P.line}`, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: P.inkSoft, position: "sticky", top: 0, background: P.cream };
const td = { padding: "8px 12px", borderBottom: `1px solid ${P.line}`, verticalAlign: "top" };

export default function ImportPicks() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dry, setDry] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const s = sessionStorage.getItem("qp_admin_pw");
    if (s) { setPw(s); setAuthed(true); }
  }, []);

  async function preview() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/import-picks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, mode: "dryrun" }) });
      const j = await r.json();
      if (!r.ok) setMsg({ type: "err", text: j.error || "Failed" });
      else { setDry(j); setSelected(new Set(j.items.filter((i) => i.importable).map((i) => i.name))); }
    } catch (e) { setMsg({ type: "err", text: String(e) }); }
    setBusy(false);
  }

  async function publish() {
    if (!dry) return;
    const rows = dry.items.filter((i) => i.importable && selected.has(i.name)).map((i) => i.row);
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/import-picks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, mode: "commit", rows }) });
      const j = await r.json();
      if (!r.ok) setMsg({ type: "err", text: j.error || "Failed" });
      else { setMsg({ type: "ok", text: `Published ${j.inserted} pick(s).${j.skipped ? " " + j.skipped + " already existed and were skipped." : ""}${j.error ? " Error: " + j.error : ""}` }); setDry(null); }
    } catch (e) { setMsg({ type: "err", text: String(e) }); }
    setBusy(false);
  }

  const toggle = (name) => setSelected((s) => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });
  const selCount = dry ? dry.items.filter((i) => i.importable && selected.has(i.name)).length : 0;

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
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "22px 18px 70px" }}>
        <Link href="/admin" style={{ color: P.navy, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Back to admin</Link>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, margin: "12px 0 4px" }}>Import your Local Picks</h1>
        <p style={{ color: P.inkSoft, fontSize: 15, margin: "0 0 20px", maxWidth: "64ch" }}>
          Run the <strong>preview</strong>, then uncheck anything that doesn&apos;t belong, then publish. Nothing is written until you click publish.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={preview} disabled={busy} style={btn(P.navy, !busy)}>{busy ? "Working… (~30–60s)" : "1 · Preview import (dry run)"}</button>
          {dry && <button onClick={publish} disabled={busy || selCount === 0} style={btn(P.coral, !busy && selCount > 0)}>2 · Publish {selCount} pick{selCount === 1 ? "" : "s"}</button>}
        </div>

        {msg && (
          <div style={{ marginTop: 16, padding: "11px 14px", borderRadius: 10, fontSize: 14,
            background: msg.type === "ok" ? "#E7F4EE" : "#FBE7EF", color: msg.type === "ok" ? P.green : P.coral, border: `1px solid ${msg.type === "ok" ? P.green : P.coral}44` }}>
            {msg.text}
          </div>
        )}

        {dry && dry.allErrored && (
          <div style={{ marginTop: 16, padding: "13px 15px", borderRadius: 10, fontSize: 13.5, background: "#FBE7EF", color: P.coral, border: `1px solid ${P.coral}44` }}>
            <strong>Every lookup failed.</strong> Error: <code>{dry.sampleError || "unknown"}</code>. This is almost always a Google Cloud setting, not your data. Check, in the Google Cloud console:
            <ol style={{ margin: "8px 0 0", paddingLeft: 18, color: P.ink }}>
              <li>The key&apos;s <strong>Application restriction</strong> is <strong>None</strong> or IP-based, <em>not</em> &quot;HTTP referrers&quot; (referrer-restricted keys reject server-side calls — the usual 403 cause).</li>
              <li><strong>Places API (New)</strong> is <em>enabled</em> for the project (APIs &amp; Services → Library).</li>
              <li>The key&apos;s <strong>API restrictions</strong> include &quot;Places API (New)&quot; (or set to &quot;Don&apos;t restrict key&quot; while testing).</li>
              <li><strong>Billing</strong> is active on the project.</li>
            </ol>
            Fix, wait a minute, then re-run the preview.
          </div>
        )}

        {dry && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>{dry.willImport} of {dry.total} matched + in-area. Uncheck any you don&apos;t want, then publish.</p>
            <div style={{ overflowX: "auto", border: `1px solid ${P.line}`, borderRadius: 12, background: "#fff", maxHeight: "70vh", overflowY: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720, fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: 34 }}></th>
                    <th style={th}>List</th>
                    <th style={th}>Place</th>
                    <th style={th}>Import?</th>
                    <th style={th}>Matched address</th>
                    <th style={th}>km</th>
                    <th style={th}>Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {dry.items.map((r, i) => {
                    const on = r.importable && selected.has(r.name);
                    return (
                      <tr key={i} style={{ opacity: r.importable ? 1 : 0.55, background: on ? "#fff" : (r.importable ? "#fff" : "#FBF7F0") }}>
                        <td style={td}>
                          {r.importable
                            ? <input type="checkbox" checked={on} onChange={() => toggle(r.name)} style={{ width: 16, height: 16, accentColor: P.coral, cursor: "pointer" }} />
                            : <span style={{ color: P.inkSoft }}>—</span>}
                        </td>
                        <td style={{ ...td, color: P.inkSoft, whiteSpace: "nowrap" }}>{r.list || "—"}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                        <td style={td}>
                          {r.importable
                            ? <span style={{ color: P.green, fontWeight: 700 }}>✓ yes</span>
                            : <span style={{ color: P.inkSoft }}>{r.error ? "error: " + r.error : (!r.matched ? "no match" : "out of area")}</span>}
                        </td>
                        <td style={{ ...td, color: P.inkSoft }}>{r.address || "—"}</td>
                        <td style={{ ...td, color: P.inkSoft, whiteSpace: "nowrap" }}>{r.km != null ? r.km : "—"}</td>
                        <td style={td}>{r.photo ? "📷" : "—"}</td>
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
