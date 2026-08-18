"use client";
import { useState } from "react";
import Link from "next/link";

// Shared Guides dropdown used by BOTH the client app and the server-rendered content
// pages, so the nav is identical everywhere. Plan / Move / Book are always links; Walking
// paths switches in place inside the app (onWalks) or links to /?view=walks otherwise.
const DEFAULT_P = { ink: "#241C14", inkSoft: "#6B5D4F", line: "#E7DDCB" };

export default function GuidesDropdown({ lang = "en", P, tabStyle, onWalks, active }) {
  const c = P || DEFAULT_P;
  const [open, setOpen] = useState(false);
  const es = lang === "es";
  const on = active === "guides";
  const base = tabStyle || { border: "none", cursor: "pointer", background: "transparent", fontSize: 16.5, fontWeight: 700, padding: "6px 2px", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, textDecoration: "none", color: c.ink, borderBottom: "3px solid transparent" };
  const linkStyle = { display: "block", width: "100%", textAlign: "left", padding: "9px 12px", color: c.ink, textDecoration: "none", fontSize: 14.5, fontWeight: 600, borderRadius: 8, whiteSpace: "nowrap", background: "transparent", border: "none", cursor: "pointer" };
  return (
    <div onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} style={{ position: "relative" }}>
      <button style={{ ...base, color: on ? "#E06A63" : c.ink, borderBottom: on ? "3px solid #E06A63" : (base.borderBottom || "3px solid transparent") }}>{es ? "Guías" : "Guides"} ▾</button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", background: "#fff", border: `1px solid ${c.line}`, borderRadius: 12, boxShadow: "0 10px 28px rgba(0,0,0,.14)", padding: 6, minWidth: 190, zIndex: 100 }}>
          <Link href="/plan" style={linkStyle}>{es ? "Planea tu viaje" : "Plan your trip"}</Link>
          <Link href="/move" style={linkStyle}>{es ? "Mudarse aquí" : "Move Here"}</Link>
          <Link href="/ebook" style={linkStyle}>{es ? "El libro" : "The Book"}</Link>
          {onWalks
            ? <button onClick={() => { setOpen(false); onWalks(); }} style={linkStyle}>🚶 {es ? "Caminatas" : "Walking paths"}</button>
            : <Link href="/?view=walks" style={linkStyle}>🚶 {es ? "Caminatas" : "Walking paths"}</Link>}
        </div>
      )}
    </div>
  );
}
