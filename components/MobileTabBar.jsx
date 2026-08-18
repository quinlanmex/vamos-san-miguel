"use client";
import Link from "next/link";
import { MapPin, Clock, Sparkles, Heart } from "lucide-react";
import MobileGuidesTab from "./MobileGuidesTab";

// The same mobile bottom bar the app shows, as links, so content pages match the app on
// mobile (the nav never switches as you move around). Shown only below 680px. Plan + Move
// Here are collapsed into one "Guides" tab, matching the desktop dropdown.
const ITEMS = [
  ["picks", "Local Picks", MapPin, "/"],
  ["events", "What's On", Clock, "/?view=events"],
  ["saved", "Saved", Heart, "/?view=saved"],
  ["planner", "Plan Trip", Sparkles, "/?planner=1"],
];

export default function MobileTabBar({ active }) {
  const link = ([key, label, Ic, href]) => {
    const on = key === active;
    return (
      <Link key={key} href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "#E06A63" : "#6E604F", fontSize: 10, fontWeight: 700, textDecoration: "none", minWidth: 46 }}>
        <Ic size={21} /> {label}
      </Link>
    );
  };
  const guidesActive = active === "plan" || active === "move" || active === "ebook";
  return (
    <>
      <style>{`.ps-mobilebar{display:none}@media(max-width:679px){.ps-mobilebar{display:flex}}`}</style>
      <nav className="ps-mobilebar" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 900, background: "#fff", borderTop: "1px solid #E7DDCB", boxShadow: "0 -2px 14px rgba(13,20,40,.09)", justifyContent: "space-around", padding: "8px 0 calc(8px + env(safe-area-inset-bottom))" }}>
        {link(ITEMS[0])}
        {link(ITEMS[1])}
        <MobileGuidesTab active={guidesActive} />
        {link(ITEMS[2])}
        {link(ITEMS[3])}
      </nav>
    </>
  );
}
