"use client";
import dynamic from "next/dynamic";

// The app is highly interactive and uses Leaflet (browser-only), so it renders
// client-side. SEO note: a follow-up will server-render the event/pick content.
const VamosApp = dynamic(() => import("./App"), { ssr: false });

export default function Page() {
  return <VamosApp />;
}
