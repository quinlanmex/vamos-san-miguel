import React from "react";
import Link from "next/link";
import GuidesDropdown from "./GuidesDropdown";
import MobileTabBar from "./MobileTabBar";

// Branded server-rendered wrapper for the static guide pages (/move/*).
// Keeps them on-brand without pulling in the client app.

export default function PageShell({ children, active }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F3EC", color: "#241C14", fontFamily: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <style>{`.pageshell-logo{height:58px}@media(min-width:680px){.pageshell-logo{height:84px}}.ps-topnav{display:none}@media(min-width:680px){.ps-topnav{display:flex}}`}</style>
      {/* Same woven top stripe as the home app */}
      <div style={{ height: 8, background: "repeating-linear-gradient(135deg, #15539A 0 8px, transparent 8px 16px), repeating-linear-gradient(45deg, #E11D74 0 8px, #F2A100 8px 16px)", backgroundBlendMode: "multiply" }} />
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E7DDCB", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "9px 20px", display: "flex", alignItems: "center", gap: 22 }}>
          <Link href="/" style={{ display: "block", flexShrink: 0 }}>
            <img src="/logo-light.svg" alt="Vamos San Miguel" className="pageshell-logo" style={{ width: "auto", display: "block" }} />
          </Link>
          {/* Identical tab set + Guides dropdown as the home app, so the nav never switches. */}
          <nav className="ps-topnav" style={{ marginLeft: "auto", gap: 28, fontSize: 16.5, fontWeight: 700, alignItems: "center", flexWrap: "wrap" }}>
            {[["/", "Local Picks", "picks"], ["/?view=events", "What's On", "events"]].map(([href, label, key]) => {
              const on = key === active;
              return (
                <Link key={label} href={href}
                  style={{ color: on ? "#E06A63" : "#241C14", textDecoration: "none", whiteSpace: "nowrap", borderBottom: on ? "3px solid #E06A63" : "3px solid transparent", paddingBottom: 3 }}>
                  {label}
                </Link>
              );
            })}
            <GuidesDropdown active={active === "plan" || active === "move" || active === "ebook" ? "guides" : undefined} />
            <Link href="/?view=saved"
              style={{ color: active === "saved" ? "#E06A63" : "#241C14", textDecoration: "none", whiteSpace: "nowrap", borderBottom: active === "saved" ? "3px solid #E06A63" : "3px solid transparent", paddingBottom: 3 }}>
              Saved
            </Link>
            <Link href="/?planner=1" style={{ background: "#E06A63", color: "#fff", textDecoration: "none", whiteSpace: "nowrap", fontWeight: 800, padding: "8px 16px", borderRadius: 999 }}>✨ Plan Trip</Link>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "34px 22px 96px" }}>
        {children}
      </main>

      <MobileTabBar active={active} />

      <footer style={{ borderTop: "1px solid #E7DDCB", background: "#FFFFFF" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "22px 20px", fontSize: 13.5, color: "#6E604F", display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "space-between" }}>
          <span>Vamos San Miguel — San Miguel de Allende, Gto.</span>
          <span><Link href="/" style={{ color: "#0D1B36", textDecoration: "none", fontWeight: 600 }}>Explore Local Picks and events →</Link></span>
        </div>
      </footer>
    </div>
  );
}
