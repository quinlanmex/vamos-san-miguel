"use client";
import { useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

// Mobile bottom-bar "Guides" tab: collapses Plan / Move Here / The Book / Walking paths
// into one item (matching the desktop dropdown). Tapping pops a small menu above the bar.
// Walking paths switches in place inside the app (onWalks) or links to /?view=walks.
export default function MobileGuidesTab({ active, onWalks, lang = "en" }) {
  const [open, setOpen] = useState(false);
  const es = lang === "es";
  const color = active ? "#E06A63" : "#6E604F";
  const item = { display: "block", width: "100%", textAlign: "left", padding: "11px 14px", fontSize: 15, fontWeight: 600, color: "#241C14", textDecoration: "none", background: "transparent", border: "none", cursor: "pointer", borderRadius: 8, whiteSpace: "nowrap" };
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 46 }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color, fontSize: 10, fontWeight: 700 }}>
        <BookOpen size={21} /> {es ? "Guías" : "Guides"}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 940 }} />
          <div style={{ position: "absolute", bottom: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)", background: "#fff", border: "1px solid #E7DDCB", borderRadius: 12, boxShadow: "0 10px 28px rgba(0,0,0,.2)", padding: 6, minWidth: 190, zIndex: 950 }}>
            <Link href="/plan" style={item} onClick={() => setOpen(false)}>{es ? "Planea tu viaje" : "Plan your trip"}</Link>
            <Link href="/move" style={item} onClick={() => setOpen(false)}>{es ? "Mudarse aquí" : "Move Here"}</Link>
            <Link href="/ebook" style={item} onClick={() => setOpen(false)}>{es ? "El libro" : "The Book"}</Link>
            {onWalks
              ? <button style={item} onClick={() => { setOpen(false); onWalks(); }}>🚶 {es ? "Caminatas" : "Walking paths"}</button>
              : <Link href="/?view=walks" style={item} onClick={() => setOpen(false)}>🚶 {es ? "Caminatas" : "Walking paths"}</Link>}
          </div>
        </>
      )}
    </div>
  );
}
