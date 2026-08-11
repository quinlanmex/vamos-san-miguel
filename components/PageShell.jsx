import React from "react";
import Link from "next/link";

// Branded server-rendered wrapper for the static guide pages (/move/*).
// Keeps them on-brand without pulling in the client app.

export default function PageShell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F3EC", color: "#241C14", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <div style={{ height: 8, background: "repeating-linear-gradient(90deg, #0D1B36 0 26px, #E11D74 26px 39px, #F2B134 39px 52px)" }} />
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E7DDCB" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={{ display: "block" }}>
            <img src="/logo-light.svg" alt="Vamos San Miguel" style={{ height: 56, width: "auto", display: "block" }} />
          </Link>
          <nav style={{ marginLeft: "auto", display: "flex", gap: 18, fontSize: 15, fontWeight: 600 }}>
            <Link href="/" style={{ color: "#6E604F", textDecoration: "none" }}>Local Picks</Link>
            <Link href="/move" style={{ color: "#0D1B36", textDecoration: "none", borderBottom: "2px solid #E06A63", paddingBottom: 2 }}>Move Here</Link>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "34px 22px 70px" }}>
        {children}
      </main>

      <footer style={{ borderTop: "1px solid #E7DDCB", background: "#FFFFFF" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "22px 20px", fontSize: 13.5, color: "#6E604F", display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "space-between" }}>
          <span>Vamos San Miguel — San Miguel de Allende, Gto.</span>
          <span><Link href="/" style={{ color: "#0D1B36", textDecoration: "none", fontWeight: 600 }}>Explore Local Picks and events →</Link></span>
        </div>
      </footer>
    </div>
  );
}
