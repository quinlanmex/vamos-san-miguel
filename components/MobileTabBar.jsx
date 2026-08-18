"use client";
import Link from "next/link";
import { MapPin, Clock, Sparkles, Map as MapIcon, Home, Heart } from "lucide-react";

// The same mobile bottom bar the app shows, as links, so content pages match the app on
// mobile (the nav never switches as you move around). Shown only below 680px.
const ITEMS = [
  ["picks", "Local Picks", MapPin, "/"],
  ["events", "What's On", Clock, "/?view=events"],
  ["planner", "Plan Trip", Sparkles, "/?planner=1"],
  ["plan", "Plan", MapIcon, "/plan"],
  ["move", "Move Here", Home, "/move"],
  ["saved", "Saved", Heart, "/?view=saved"],
];

export default function MobileTabBar({ active }) {
  return (
    <>
      <style>{`.ps-mobilebar{display:none}@media(max-width:679px){.ps-mobilebar{display:flex}}`}</style>
      <nav className="ps-mobilebar" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 900, background: "#fff", borderTop: "1px solid #E7DDCB", boxShadow: "0 -2px 14px rgba(13,20,40,.09)", justifyContent: "space-around", padding: "8px 0 calc(8px + env(safe-area-inset-bottom))" }}>
        {ITEMS.map(([key, label, Ic, href]) => {
          const on = key === active;
          return (
            <Link key={key} href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "#E06A63" : "#6B5D4F", fontSize: 10, fontWeight: 700, textDecoration: "none", minWidth: 46 }}>
              <Ic size={21} /> {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
