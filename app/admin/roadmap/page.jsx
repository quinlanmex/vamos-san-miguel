"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ROADMAP_HTML } from "./roadmapContent";

const P = { plaster: "#FAF6EF", line: "#EAE2D4", ink: "#2A211A", inkSoft: "#6B5D4F", cobalt: "#15539A" };
const field = { width: "100%", padding: "9px 11px", borderRadius: 9, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", color: P.ink, background: "#fff", boxSizing: "border-box" };

export default function RoadmapPage() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("qp_admin_pw");
    if (saved) { setPw(saved); setAuthed(true); }
  }, []);

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: P.plaster, display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "#fff", border: `1px solid ${P.line}`, borderRadius: 16, padding: 28, width: 320 }}>
          <h1 style={{ fontSize: 20, margin: "0 0 4px", color: P.ink }}>Vamos SMA — Roadmap</h1>
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

  return (
    <div style={{ minHeight: "100vh", background: P.plaster, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${P.line}`, fontFamily: "system-ui, sans-serif", background: "#fff" }}>
        <Link href="/admin" style={{ color: P.cobalt, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Back to admin</Link>
        <span style={{ fontSize: 12, color: P.inkSoft }}>Internal strategy · not for public distribution</span>
      </div>
      <iframe title="Vamos San Miguel roadmap" srcDoc={ROADMAP_HTML} style={{ flex: 1, width: "100%", border: "none", minHeight: "calc(100vh - 45px)" }} />
    </div>
  );
}
