"use client";
import { useState, useCallback } from "react";
import Link from "next/link";

const P = { navy: "#0D1B36", coral: "#E06A63", cream: "#F7F3EC", card: "#fff", ink: "#241C14", inkSoft: "#6E604F", line: "#E7DDCB", green: "#2F7A63" };
const field = { width: "100%", padding: "9px 11px", borderRadius: 9, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", color: P.ink, background: "#fff", boxSizing: "border-box" };
const btn = (bg, on = true) => ({ padding: "9px 15px", border: "none", borderRadius: 9, background: on ? bg : P.inkSoft, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: on ? "pointer" : "default" });

export default function ManageArticles() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState([]);
  const [docIds, setDocIds] = useState({}); // slug -> input value
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const call = useCallback(async (path, body) => {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, ...body }) });
    return r.json();
  }, [pw]);

  const load = useCallback(async () => {
    const j = await call("/api/manage-articles", { action: "list" });
    if (j.error) { setMsg({ err: true, t: j.error }); return false; }
    setRows(j.articles || []);
    const map = {};
    for (const a of j.articles || []) map[`${a.kind}:${a.slug}`] = a.google_doc_id || "";
    setDocIds(map);
    return true;
  }, [call]);

  const login = async () => {
    setBusy(true); setMsg(null);
    const ok = await load();
    if (ok) setAuthed(true); else setMsg({ err: true, t: "Wrong password or table not created yet." });
    setBusy(false);
  };

  const run = async (label, path, body) => {
    setBusy(true); setMsg(null);
    const j = await call(path, body);
    if (j.error) setMsg({ err: true, t: `${label}: ${j.error}` });
    else setMsg({ err: false, t: `${label}: ${JSON.stringify(j)}` });
    await load();
    setBusy(false);
  };

  const saveDocId = async (row) => {
    const key = `${row.kind}:${row.slug}`;
    await run(`Saved Doc ID for ${row.slug}`, "/api/manage-articles", { action: "setDocId", kind: row.kind, slug: row.slug, google_doc_id: docIds[key] || "" });
  };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: P.cream, display: "grid", placeItems: "center", padding: 20 }}>
        <div style={{ background: "#fff", border: `1px solid ${P.line}`, borderRadius: 14, padding: 24, width: 320 }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, margin: "0 0 6px", color: P.navy }}>Guides · Docs sync</h1>
          <p style={{ fontSize: 13, color: P.inkSoft, margin: "0 0 16px" }}>Enter the admin password.</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} placeholder="Password" style={field} />
          <button onClick={login} disabled={busy} style={{ ...btn(P.navy), width: "100%", marginTop: 12 }}>{busy ? "…" : "Enter"}</button>
          {msg && <p style={{ fontSize: 13, color: msg.err ? P.coral : P.green, marginTop: 12 }}>{msg.t}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: P.cream, padding: "24px 18px 80px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, margin: 0, color: P.navy }}>Guides · Google Docs sync</h1>
          <Link href="/admin/manage" style={{ fontSize: 13, fontWeight: 700, color: P.coral, textDecoration: "none" }}>Picks & events →</Link>
        </div>
        <p style={{ fontSize: 14, color: P.inkSoft, lineHeight: 1.55, margin: "0 0 18px", maxWidth: "70ch" }}>
          Map each guide to a Google Doc, then edit the Doc and press <b>Sync from Google Docs</b> (the daily cron does it automatically too).
          First time here? Press <b>Seed from markdown</b> once to load the current guide content into the database.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <button onClick={() => run("Seeded", "/api/seed-articles", {})} disabled={busy} style={btn(P.navy, !busy)}>Seed from markdown</button>
          <button onClick={() => run("Created Docs", "/api/provision-docs", {})} disabled={busy} style={btn("#B4791F", !busy)}>Create guide Docs</button>
          <button onClick={() => run("Synced", "/api/sync-docs", {})} disabled={busy} style={btn(P.green, !busy)}>Sync from Google Docs</button>
          <button onClick={load} disabled={busy} style={btn(P.inkSoft, !busy)}>Refresh</button>
        </div>

        {msg && <p style={{ fontSize: 13, color: msg.err ? P.coral : P.green, margin: "0 0 16px", wordBreak: "break-word" }}>{msg.t}</p>}

        {rows.length === 0 && <p style={{ color: P.inkSoft }}>No articles yet. Press <b>Seed from markdown</b> to load the guides.</p>}

        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((row) => {
            const key = `${row.kind}:${row.slug}`;
            return (
              <div key={key} style={{ background: "#fff", border: `1px solid ${P.line}`, borderRadius: 12, padding: "13px 15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: P.navy, fontSize: 15 }}>{row.title || row.slug}</span>
                    <span style={{ fontSize: 12, color: "#B9AE9C", marginLeft: 8 }}>{row.kind}/{row.slug}</span>
                  </div>
                  <span style={{ fontSize: 12, display: "flex", gap: 10, alignItems: "center" }}>
                    {row.google_doc_id && (
                      <a href={`https://docs.google.com/document/d/${row.google_doc_id}/edit`} target="_blank" rel="noreferrer"
                        style={{ color: P.coral, fontWeight: 700, textDecoration: "none" }}>Open Doc ↗</a>
                    )}
                    <span style={{ color: row.synced_at ? P.green : "#B9AE9C" }}>
                      {row.synced_at ? `Synced ${new Date(row.synced_at).toLocaleDateString()}` : "Not synced"}
                    </span>
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={docIds[key] ?? ""}
                    onChange={(e) => setDocIds((m) => ({ ...m, [key]: e.target.value }))}
                    placeholder="Google Doc ID (the long id in the Doc URL)"
                    style={{ ...field, flex: 1 }}
                  />
                  <button onClick={() => saveDocId(row)} disabled={busy} style={btn(P.coral, !busy)}>Save</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
