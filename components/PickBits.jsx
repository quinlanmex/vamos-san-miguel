import Link from "next/link";

// Shared, presentational building blocks for the data-driven guide pages (the flagship
// "things to do" page, the Plan guides, and the /guide collection pages). Pure UI — no data
// fetching, no server-only imports — so it renders inside any server component. Each page
// fetches its own picks/best-of/events and hands them in.

export const pickTake = (p) => (p?.local_take || p?.ai_notes || p?.desc_en || "").trim();

export const H2 = ({ children, id }) => (
  <h2 id={id} style={{ fontFamily: "Georgia, serif", fontSize: 25, margin: "34px 0 8px", color: "#0D1B36", lineHeight: 1.15 }}>{children}</h2>
);
export const P = ({ children }) => (
  <p style={{ fontSize: 15.5, lineHeight: 1.62, color: "#3A3226", margin: "0 0 12px" }}>{children}</p>
);
export const Kicker = ({ children }) => (
  <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#B4791F", margin: "0 0 8px" }}>{children}</p>
);

// A single Local Pick, with its opinionated take quoted. `rank` shows a numbered badge (for
// ranked "best of" lists); omit it for unordered blocks.
export function PickCard({ p, rank }) {
  return (
    <div style={{ display: "flex", gap: 13, background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 13, padding: 12, marginBottom: 10 }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        {p.photo_url
          ? <img src={p.photo_url} alt={p.name} loading="lazy" style={{ width: 84, height: 84, borderRadius: 10, objectFit: "cover", background: "#EFE7D8" }} />
          : <span style={{ display: "block", width: 84, height: 84, borderRadius: 10, background: "linear-gradient(135deg,#E06A63,#F2A100)" }} />}
        {rank != null && (
          <span style={{ position: "absolute", top: -7, left: -7, width: 24, height: 24, borderRadius: "50%", background: "#0D1B36", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>{rank}</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: 18, margin: "0 0 1px", color: "#0D1B36", lineHeight: 1.15 }}>{p.name}</h3>
        {p.area && <p style={{ fontSize: 11.5, fontWeight: 700, color: "#B4791F", margin: "0 0 5px", textTransform: "uppercase", letterSpacing: ".04em" }}>{p.area}</p>}
        <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#3A3226", margin: 0 }}>{pickTake(p).slice(0, 240)}</p>
        <Link href={`/?place=${encodeURIComponent(p.name)}`} style={{ display: "inline-block", marginTop: 6, fontSize: 12.5, fontWeight: 700, color: "#E06A63", textDecoration: "none" }}>Open in the app →</Link>
      </div>
    </div>
  );
}

// A labelled group of picks (e.g. "For a meal"). Renders nothing when empty.
export function PickBlock({ label, picks, ranked = false }) {
  if (!picks?.length) return null;
  return (
    <div style={{ margin: "6px 0 18px" }}>
      {label && <Kicker>{label}</Kicker>}
      {picks.map((p, i) => <PickCard key={p.id} p={p} rank={ranked ? i + 1 : undefined} />)}
    </div>
  );
}

// Best-of winners, compact. `items` = [{ href, label, name, photo_url }].
export function BestOfRow({ items }) {
  if (!items?.length) return null;
  return (
    <div style={{ display: "grid", gap: 8, margin: "0 0 8px" }}>
      {items.map((c) => (
        <Link key={c.href} href={c.href} style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: "inherit", background: "#FFFFFF", border: "1px solid #E7DDCB", borderRadius: 12, padding: 11 }}>
          {c.photo_url
            ? <img src={c.photo_url} alt="" loading="lazy" style={{ width: 44, height: 44, borderRadius: 9, objectFit: "cover", flexShrink: 0, background: "#EFE7D8" }} />
            : <span style={{ width: 44, height: 44, borderRadius: 9, background: "#EFE7D8", flexShrink: 0 }} />}
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#E06A63", textTransform: "uppercase", letterSpacing: ".04em" }}>{c.label}</span>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: "#0D1B36" }}>{c.name}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Upcoming events, compact. Each event needs { id, occ: Date, title_en, venue }.
export function EventList({ events }) {
  if (!events?.length) return null;
  return (
    <div style={{ margin: "0 0 8px" }}>
      {events.map((e) => (
        <div key={e.id} style={{ display: "flex", gap: 12, padding: "9px 0", borderTop: "1px solid #E7DDCB" }}>
          <div style={{ flexShrink: 0, width: 44, textAlign: "center" }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 800, color: "#0D1B36", lineHeight: 1 }}>{e.occ.getDate()}</div>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", color: "#B4791F", fontWeight: 700 }}>{MONTHS[e.occ.getMonth()]}</div>
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: 16, margin: 0, color: "#0D1B36", lineHeight: 1.2 }}>{e.title_en}</h3>
            {e.venue && <p style={{ fontSize: 12.5, color: "#6E604F", margin: "1px 0 0" }}>{e.venue}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function InlineLink({ href, children }) {
  return <Link href={href} style={{ color: "#E06A63", fontWeight: 700, textDecoration: "none" }}>{children}</Link>;
}

// The "let the planner build your day" call-to-action box.
export function PlanCTA({ blurb }) {
  return (
    <div style={{ marginTop: 30, padding: "20px 22px", background: "#0D1B36", color: "#F7F3EC", borderRadius: 16 }}>
      <p style={{ margin: "0 0 6px", fontFamily: "Georgia, serif", fontSize: 19, color: "#fff" }}>Let us plan the day for you</p>
      <p style={{ margin: "0 0 14px", fontSize: 14.5, lineHeight: 1.55, opacity: .92 }}>
        {blurb || "Tell our planner your dates and pace and it builds a San Miguel day around these picks, walking distances and all."}
      </p>
      <Link href="/?planner=1" style={{ display: "inline-block", background: "#E06A63", color: "#fff", fontWeight: 700, fontSize: 14.5, padding: "10px 18px", borderRadius: 11, textDecoration: "none" }}>✨ Plan my trip →</Link>
    </div>
  );
}

// A simple FAQ list. `faqs` = [{ q, a }].
export function FaqList({ faqs }) {
  if (!faqs?.length) return null;
  return (
    <>
      {faqs.map((f, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 15.5, fontWeight: 700, color: "#0D1B36", margin: "0 0 3px" }}>{f.q}</p>
          <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "#5A4F40", margin: 0 }}>{f.a}</p>
        </div>
      ))}
    </>
  );
}
