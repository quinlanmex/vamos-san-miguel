"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CUISINES, GOODFOR } from "../../../components/cuisines";
import { NEIGHBORHOODS, nearestNeighborhood, kmFromCentro, IN_TOWN_KM } from "../../../lib/neighborhoods";
import { Salad, Sprout } from "lucide-react";

const P = { navy: "#0D1B36", coral: "#E06A63", cream: "#F7F3EC", card: "#fff", ink: "#241C14", inkSoft: "#6E604F", line: "#E7DDCB", green: "#2F7A63" };
const CATS = [["musica", "Music"], ["cine", "Film"], ["tours", "Tours"], ["comunidad", "Community"], ["charlas", "Talks"], ["mercados", "Markets"], ["bienestar", "Wellness"]];
const LISTS = [["rest", "Restaurant / Café"], ["bar", "Bar / Cantina"],
  ["wellness", "Wellness / Spa"], ["parks", "Park / Outdoors"], ["culture", "Arts & Culture"], ["shopping", "Shopping"]];
const LIST_LABEL = Object.fromEntries(LISTS);
const AUD = [["family", "Family"], ["teens", "Teens"]];
const DIET = [["vegetarian", "Vegetarian", Salad], ["vegan", "Vegan", Sprout]];
const STATUS = [["published", "Published"], ["hidden", "Hidden"], ["draft", "Draft"], ["archived", "Archived"]];
const STATUS_COLOR = { published: "#2F7A63", hidden: "#B4791F", draft: "#6E604F", archived: "#9A8F7E" };
const STATUS_LABEL = Object.fromEntries(STATUS);
const BIZ_STATUS = [["OPERATIONAL", "Open"], ["CLOSED_PERMANENTLY", "Permanently closed"], ["CLOSED_TEMPORARILY", "Temporarily closed"]];

const field = { width: "100%", padding: "9px 11px", borderRadius: 9, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", color: P.ink, background: "#fff", boxSizing: "border-box" };
const label = { fontSize: 12, fontWeight: 700, color: P.inkSoft, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4, display: "block" };
const chip = (on, c) => ({ padding: "6px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${on ? c : P.line}`, background: on ? c : "#fff", color: on ? "#fff" : P.inkSoft });
const mini = (on, c) => ({ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", border: `1px solid ${on ? c : P.line}`, background: on ? c : "#fff", color: on ? "#fff" : "#B9AE9C" });
const CUI_KEYS = Object.keys(CUISINES).filter((k) => !GOODFOR.includes(k)).sort((a, b) => CUISINES[a].en.localeCompare(CUISINES[b].en));
const btn = (bg, on = true) => ({ padding: "9px 15px", border: "none", borderRadius: 9, background: on ? bg : P.inkSoft, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: on ? "pointer" : "default" });

// Pull [lat, lng] out of a "lat, lng" string or a pasted Google Maps URL (several formats).
function parseCoords(s) {
  if (!s) return null;
  const t = String(s).trim();
  const pats = [
    /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/, // "lat, lng"
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,                        // .../@lat,lng,17z
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,                    // !3dlat!4dlng
    /[?&](?:q|query|ll)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,      // ?q=lat,lng
  ];
  for (const re of pats) {
    const m = t.match(re);
    if (m) {
      const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lat, lng];
    }
  }
  return null;
}

export default function Manage() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [kind, setKind] = useState("place");
  const [data, setData] = useState({ events: [], places: [] });
  const [editing, setEditing] = useState(null); // record or {} for new
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [q, setQ] = useState("");
  const [need, setNeed] = useState("all"); // quick filter: all / nocuisine / nophoto / hidden / featured
  const [sortBy, setSortBy] = useState("name"); // name / newest / attention
  const [selected, setSelected] = useState(new Set()); // bulk-selected ids
  const [uploading, setUploading] = useState(false);
  const [coordPaste, setCoordPaste] = useState(""); // paste-a-Maps-link box in the editor

  const api = useCallback(async (body) => {
    const r = await fetch("/api/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, ...body }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed");
    return j;
  }, [pw]);

  const load = useCallback(async () => {
    try { const j = await api({ action: "list" }); setData({ events: j.events, places: j.places }); }
    catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
  }, [api]);

  useEffect(() => {
    const s = sessionStorage.getItem("qp_admin_pw");
    if (s) { setPw(s); setAuthed(true); }
  }, []);
  useEffect(() => { if (authed) load(); }, [authed, load]);

  const upd = (k, v) => setEditing((e) => ({ ...e, [k]: v }));
  const toggle = (k, val) => setEditing((e) => { const s = new Set(e[k] || []); s.has(val) ? s.delete(val) : s.add(val); return { ...e, [k]: [...s] }; });

  async function save() {
    setBusy(true); setMsg(null);
    try {
      await api({ action: "save", kind, id: editing.id, record: editing });
      setEditing(null); await load(); setMsg({ type: "ok", text: "Saved." });
    } catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setBusy(false);
  }
  async function uploadPhoto(files) {
    const file = files && files[0];
    if (!file) return;
    setUploading(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append("password", pw); fd.append("kind", kind); fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");
      upd("photo_url", j.url);
      setMsg({ type: "ok", text: "Photo uploaded — remember to Save." });
    } catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setUploading(false);
  }
  async function uploadGallery(files) {
    const file = files && files[0];
    if (!file) return;
    setUploading(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append("password", pw); fd.append("kind", kind); fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");
      setEditing((e) => ({ ...e, photos: [...(e.photos || []), j.url] }));
      setMsg({ type: "ok", text: "Gallery photo added — remember to Save." });
    } catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setUploading(false);
  }
  const removePhoto = (url) => setEditing((e) => ({ ...e, photos: (e.photos || []).filter((p) => p !== url) }));

  // Inline edits: optimistically update the row, then persist a partial patch.
  async function patchRow(id, fields) {
    setData((prev) => {
      const upd = (arr) => arr.map((r) => (r.id === id ? { ...r, ...fields } : r));
      return { events: upd(prev.events), places: upd(prev.places) };
    });
    try { await api({ action: "patch", kind, id, record: fields }); }
    catch (e) { setMsg({ type: "err", text: String(e.message || e) }); await load(); }
  }
  const toggleIn = (r, field, key) => {
    const cur = r[field] || [];
    patchRow(r.id, { [field]: cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key] });
  };

  // Upload a photo straight from a row's thumbnail.
  async function uploadRowPhoto(id, files) {
    const file = files && files[0];
    if (!file) return;
    setUploading(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append("password", pw); fd.append("kind", "place"); fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");
      await patchRow(id, { photo_url: j.url });
    } catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setUploading(false);
  }

  // Bulk actions on the selected rows.
  const selRows = () => (kind === "event" ? data.events : data.places).filter((r) => selected.has(r.id));
  async function bulkPatch(fields) {
    const ids = [...selected];
    for (const id of ids) await patchRow(id, fields);
    setMsg({ type: "ok", text: `Updated ${ids.length}.` });
    setSelected(new Set());
  }
  async function bulkStatus(status) { await bulkPatch({ status }); }
  async function bulkFeature(v) { await bulkPatch({ featured: v }); }
  async function bulkDelete() {
    const ids = [...selected];
    if (!confirm(`Delete ${ids.length} item(s)? This cannot be undone.`)) return;
    setBusy(true); setMsg(null);
    try { for (const id of ids) await api({ action: "delete", kind, id }); await load(); setMsg({ type: "ok", text: `Deleted ${ids.length}.` }); }
    catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setSelected(new Set()); setBusy(false);
  }

  // Move a featured pick up/down in the manual rotation order.
  async function moveFeatured(list, r, dir) {
    const ordered = list.filter((x) => x.featured).sort((a, b) => (a.featured_rank ?? 9999) - (b.featured_rank ?? 9999));
    const i = ordered.findIndex((x) => x.id === r.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    // Reassign clean sequential ranks with the two swapped.
    const arr = [...ordered];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    for (let k = 0; k < arr.length; k++) await patchRow(arr[k].id, { featured_rank: k });
  }

  const [applying, setApplying] = useState(false);
  async function applyUpdates() {
    if (!confirm("Add the reviewed cuisine + views/vineyard tags to all matching picks? This only ADDS tags (your manual edits are kept).")) return;
    setApplying(true); setMsg(null);
    try {
      const r = await fetch("/api/apply-updates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      await load();
      setMsg({ type: "ok", text: `${j.applied} picks checked · ${j.added || 0} tags added${j.notFound ? ` · ${j.notFound} not matched` : ""}.` });
    } catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setApplying(false);
  }

  const [discovering, setDiscovering] = useState(false);
  async function discoverEvents() {
    setDiscovering(true); setMsg(null);
    try {
      const r = await fetch("/api/discover-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      await load();
      setMsg({ type: "ok", text: `Scanned online sources · found ${j.found}, added ${j.added} new event(s).` });
    } catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setDiscovering(false);
  }

  const [driveTiming, setDriveTiming] = useState(false);
  async function computeDriveTimes() {
    setDriveTiming(true); setMsg(null);
    try {
      const r = await fetch("/api/drive-times", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      await load();
      setMsg({ type: "ok", text: `Filled drive time for ${j.filled || 0} out-of-town pick(s)${j.note ? " · " + j.note : ""}.` });
    } catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setDriveTiming(false);
  }

  const [geocoding, setGeocoding] = useState(false);
  async function geocodeEvents() {
    setGeocoding(true); setMsg(null);
    try {
      const r = await fetch("/api/geocode-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      await load();
      setMsg({ type: "ok", text: `Geocoded ${j.geocoded || 0} event(s)${j.note ? " · " + j.note : ""}.` });
    } catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setGeocoding(false);
  }


  const [importingEv, setImportingEv] = useState(false);
  async function importEvents() {
    if (!confirm("Import the researched events? Verified ones publish; a few with inferred times come in as drafts. Only future events show on the site.")) return;
    setImportingEv(true); setMsg(null);
    try {
      const r = await fetch("/api/import-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      await load();
      setMsg({ type: "ok", text: `Imported ${j.inserted} events${j.skipped ? ` · ${j.skipped} already existed` : ""}. High-confidence ones are live; drafts are staged below.` });
    } catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setImportingEv(false);
  }

  const [checking, setChecking] = useState(false);
  async function checkClosures() {
    setChecking(true); setMsg(null);
    try {
      const r = await fetch("/api/check-closures", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Check failed");
      await load();
      const parts = [`Checked ${j.checked}`];
      if (j.closedCount) parts.push(`${j.closedCount} newly closed`);
      if (j.hiddenCount) parts.push(`${j.hiddenCount} hidden (closed)`);
      if (j.reopenedCount) parts.push(`${j.reopenedCount} reopened`);
      const changed = j.closedCount || j.hiddenCount || j.reopenedCount;
      if (j.updateError) { setMsg({ type: "err", text: `${parts.join(" · ")} · DB error: ${j.updateError}` }); }
      else { setMsg({ type: "ok", text: parts.join(" · ") + (changed ? "" : " · no changes") }); }
    } catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setChecking(false);
  }

  async function setStatus(id, status) {
    setBusy(true); setMsg(null);
    try { await api({ action: "setStatus", kind, id, record: { status } }); await load(); }
    catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setBusy(false);
  }
  async function del(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusy(true); setMsg(null);
    try { await api({ action: "delete", kind, id }); await load(); setMsg({ type: "ok", text: "Deleted." }); }
    catch (e) { setMsg({ type: "err", text: String(e.message || e) }); }
    setBusy(false);
  }

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: P.cream, display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "#fff", border: `1px solid ${P.line}`, borderRadius: 16, padding: 28, width: 320 }}>
          <h1 style={{ fontSize: 20, margin: "0 0 4px", color: P.ink }}>Manage content</h1>
          <p style={{ fontSize: 13, color: P.inkSoft, margin: "0 0 16px" }}>Enter the admin password.</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" style={field}
            onKeyDown={(e) => { if (e.key === "Enter" && pw) { sessionStorage.setItem("qp_admin_pw", pw); setAuthed(true); } }} />
          <button onClick={() => { if (pw) { sessionStorage.setItem("qp_admin_pw", pw); setAuthed(true); } }} style={{ ...btn(P.navy), marginTop: 12, width: "100%" }}>Enter</button>
        </div>
      </div>
    );
  }

  const isPlace = kind === "place";
  const allRows = kind === "event" ? data.events : data.places;
  const nameOf = (r) => (isPlace ? r.name : (r.title_en || r.title_es)) || "";
  const ql = q.trim().toLowerCase();
  const hasRealCuisine = (r) => (r.cuisine || []).some((c) => !GOODFOR.includes(c));
  const noPhoto = (r) => !r.photo_url && !(r.photos || []).length;
  let rows = ql
    ? allRows.filter((r) => nameOf(r).toLowerCase().includes(ql) || (r.status || "").toLowerCase().includes(ql) || (r.category || "").toLowerCase().includes(ql))
    : allRows;
  if (isPlace && need !== "all") {
    rows = rows.filter((r) =>
      need === "nocuisine" ? (r.list_key === "rest" && !hasRealCuisine(r))
        : need === "nophoto" ? noPhoto(r)
        : need === "hidden" ? r.status !== "published"
        : need === "featured" ? !!r.featured
        : true);
  }
  const attnScore = (r) => (isPlace && r.list_key === "rest" && !hasRealCuisine(r) ? 2 : 0) + (isPlace && noPhoto(r) ? 1 : 0);
  rows = [...rows].sort((a, b) =>
    sortBy === "newest" ? new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
      : sortBy === "attention" ? (attnScore(b) - attnScore(a)) || nameOf(a).localeCompare(nameOf(b))
      : sortBy === "priority" ? ((a.priority ?? 9) - (b.priority ?? 9)) || nameOf(a).localeCompare(nameOf(b))
      : need === "featured" ? ((a.featured_rank ?? 9999) - (b.featured_rank ?? 9999))
      : nameOf(a).localeCompare(nameOf(b)));
  const liveCount = allRows.filter((r) => r.status === "published").length;
  const needCounts = {
    nocuisine: data.places.filter((r) => r.list_key === "rest" && !hasRealCuisine(r)).length,
    nophoto: data.places.filter(noPhoto).length,
    featured: data.places.filter((r) => r.featured).length,
  };

  return (
    <div style={{ minHeight: "100vh", background: P.cream, color: P.ink, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "22px 18px 70px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/admin" style={{ color: P.navy, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Back to admin</Link>
          <Link href="/admin/articles" style={{ color: P.coral, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>Guides · Docs sync →</Link>
        </div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, margin: "12px 0 14px" }}>Manage content</h1>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[["place", "Local Picks"], ["event", "Events"]].map(([k, lbl]) => (
            <button key={k} onClick={() => { setKind(k); setEditing(null); }}
              style={{ border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, padding: "8px 4px", marginRight: 14, background: "transparent",
                color: kind === k ? P.ink : P.inkSoft, borderBottom: kind === k ? `3px solid ${P.coral}` : "3px solid transparent" }}>
              {lbl} <span style={{ color: P.inkSoft, fontWeight: 600 }}>({k === "event" ? data.events.length : data.places.length})</span>
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ marginBottom: 14, padding: "9px 13px", borderRadius: 9, fontSize: 13.5, background: msg.type === "ok" ? "#E7F4EE" : "#FBE7EF", color: msg.type === "ok" ? P.green : P.coral, border: `1px solid ${msg.type === "ok" ? P.green : P.coral}44` }}>{msg.text}</div>
        )}

        {!editing && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 14 }}>
              <button onClick={() => setEditing(isPlace ? { list_key: "rest", category: "mercados", audience: [], diet: [], cuisine: [], photos: [], status: "published" } : { category: "musica", audience: [], status: "published", recurring: false })}
                style={btn(P.coral)}>+ Add {isPlace ? "a Local Pick" : "an event"} manually</button>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${allRows.length} ${isPlace ? "picks" : "events"}…`}
                style={{ ...field, flex: 1, minWidth: 180, maxWidth: 320 }} />
              <span style={{ fontSize: 13, color: P.inkSoft, whiteSpace: "nowrap" }}>
                <strong style={{ color: P.green }}>{liveCount}</strong> live · {allRows.length - liveCount} hidden/other
              </span>
              {isPlace && (
                <button onClick={applyUpdates} disabled={applying} title="Apply the reviewed cuisine + views/vineyard tags"
                  style={{ ...btn(P.green, !applying), marginLeft: "auto" }}>{applying ? "Applying…" : "Apply reviewed tags"}</button>
              )}
              {isPlace && (
                <button onClick={computeDriveTimes} disabled={driveTiming} title="Fill real driving time from Centro for out-of-town picks (Google Distance Matrix)"
                  style={btn("#B4791F", !driveTiming)}>{driveTiming ? "Computing…" : "Compute drive times"}</button>
              )}
              {isPlace && (
                <button onClick={checkClosures} disabled={checking} title="Check every pick against Google for permanent closures"
                  style={btn(P.navy, !checking)}>{checking ? "Checking Google…" : "Check for closures"}</button>
              )}
              {!isPlace && (
                <button onClick={discoverEvents} disabled={discovering} title="Scan public sources now for new events (also runs automatically daily)"
                  style={{ ...btn(P.green, !discovering), marginLeft: "auto" }}>{discovering ? "Scanning…" : "Discover events now"}</button>
              )}
              {!isPlace && (
                <button onClick={geocodeEvents} disabled={geocoding} title="Fill map coordinates for events missing them (never overwrites a manual pin)"
                  style={btn("#B4791F", !geocoding)}>{geocoding ? "Geocoding…" : "Geocode events"}</button>
              )}
              {!isPlace && (
                <button onClick={importEvents} disabled={importingEv} title="Import the initial researched batch"
                  style={btn(P.navy, !importingEv)}>{importingEv ? "Importing…" : "Import initial batch"}</button>
              )}
            </div>

            {isPlace && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12, alignItems: "center" }}>
                {[["all", "All", null], ["nocuisine", "⚠ No cuisine", needCounts.nocuisine], ["nophoto", "No photo", needCounts.nophoto], ["featured", "★ Featured", needCounts.featured], ["hidden", "Hidden / closed", null]].map(([k, lbl, count]) => {
                  const on = need === k;
                  return (
                    <button key={k} onClick={() => setNeed(k)}
                      style={{ cursor: "pointer", padding: "5px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, border: `1px solid ${on ? P.navy : P.line}`, background: on ? P.navy : "#fff", color: on ? "#fff" : P.inkSoft }}>
                      {lbl}{count != null && count > 0 ? ` (${count})` : ""}
                    </button>
                  );
                })}
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} title="Sort"
                  style={{ ...field, width: "auto", padding: "6px 8px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", marginLeft: "auto" }}>
                  <option value="name">Sort: Name</option>
                  <option value="priority">Sort: Priority, then name</option>
                  <option value="newest">Sort: Recently edited</option>
                  <option value="attention">Sort: Needs data first</option>
                </select>
              </div>
            )}

            {selected.size > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 14, padding: "9px 13px", background: P.navy, color: "#fff", borderRadius: 11 }}>
                <strong style={{ fontSize: 13.5 }}>{selected.size} selected</strong>
                {[["Publish", () => bulkStatus("published")], ["Hide", () => bulkStatus("hidden")], ...(isPlace ? [["★ Feature", () => bulkFeature(true)], ["Unfeature", () => bulkFeature(false)]] : [])].map(([lbl, fn]) => (
                  <button key={lbl} onClick={fn} disabled={busy} style={{ cursor: "pointer", border: "1px solid rgba(255,255,255,.3)", background: "transparent", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "5px 11px", borderRadius: 999 }}>{lbl}</button>
                ))}
                <button onClick={bulkDelete} disabled={busy} style={{ cursor: "pointer", border: "1px solid rgba(255,255,255,.3)", background: "transparent", color: "#F6B8AE", fontWeight: 700, fontSize: 12.5, padding: "5px 11px", borderRadius: 999 }}>Delete</button>
                <button onClick={() => setSelected(new Set())} style={{ cursor: "pointer", border: "none", background: "transparent", color: "rgba(255,255,255,.8)", fontWeight: 600, fontSize: 12.5, marginLeft: "auto" }}>Clear</button>
              </div>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: P.inkSoft, marginBottom: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
              Select all {rows.length} shown
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <datalist id="qp-hoods">
                {NEIGHBORHOODS.map((n) => <option key={n.name} value={n.name} />)}
              </datalist>
              {rows.map((r) => {
                const closed = r.business_status === "CLOSED_PERMANENTLY";
                const live = r.status === "published" && !closed;
                const noCuisine = isPlace && r.list_key === "rest" && !(r.cuisine || []).some((c) => !GOODFOR.includes(c));
                const closedOn = r.closed_at ? new Date(r.closed_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;
                // Neighborhood: manual override (r.area if it's a real colonia) vs the live auto value.
                const nbGeneric = !r.area || /^san miguel(\s+de\s+allende)?$/i.test(String(r.area).trim());
                const nbOverride = nbGeneric ? "" : r.area;
                const nbKm = (r.lat != null && r.lng != null) ? kmFromCentro(r.lat, r.lng) : null;
                const nbAuto = nbKm == null ? "" : nbKm >= IN_TOWN_KM
                  ? (r.centro_min != null ? `${r.centro_min} min from Centro` : `~${Math.round(nbKm * 2.0)} min from Centro`)
                  : (nearestNeighborhood(r.lat, r.lng) || "Centro");
                return (
                <div key={r.id} style={{ background: closed ? "#FBEEEC" : P.card, border: `1px solid ${closed ? P.coral + "55" : P.line}`, borderRadius: 11, padding: "10px 12px", opacity: live ? 1 : 0.62 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="checkbox" checked={selected.has(r.id)} style={{ flexShrink: 0, cursor: "pointer" }}
                      onChange={(e) => setSelected((prev) => { const s = new Set(prev); e.target.checked ? s.add(r.id) : s.delete(r.id); return s; })} />
                    {isPlace ? (
                      <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (!uploading) uploadRowPhoto(r.id, e.dataTransfer.files); }}
                        title="Click or drop an image to set the photo"
                        style={{ width: 42, height: 42, borderRadius: 8, flexShrink: 0, cursor: uploading ? "wait" : "pointer", overflow: "hidden", display: "grid", placeItems: "center", background: "#F0EADE" }}>
                        {r.photo_url
                          ? <img src={r.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: closed ? "grayscale(1)" : "none" }} />
                          : <span style={{ fontSize: 18, color: "#C9BCA6" }}>+</span>}
                        <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading}
                          onChange={(e) => { uploadRowPhoto(r.id, e.target.files); e.target.value = ""; }} />
                      </label>
                    ) : (
                      <span title={STATUS_LABEL[r.status] || r.status} style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: STATUS_COLOR[r.status] || P.inkSoft }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: closed ? "line-through" : "none" }}>{nameOf(r) || <em style={{ color: P.inkSoft }}>(untitled)</em>}</span>
                        {isPlace && r.priority && (
                          <span title="Trip-planner priority" style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", padding: "2px 8px", borderRadius: 999,
                            background: r.priority === 1 ? "#E06A63" : r.priority === 2 ? "#B4791F" : "#9A8F7E", color: "#fff" }}>
                            {r.priority === 1 ? "★ Essential" : r.priority === 2 ? "Recommended" : "Optional"}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: P.inkSoft }}>
                        {isPlace ? (LIST_LABEL[r.list_key] || r.list_key || "Pick") : `${r.category}${r.start_date ? ` · ${r.start_date}` : ""}`} · <span style={{ color: STATUS_COLOR[r.status] || P.inkSoft, fontWeight: 700 }}>{STATUS_LABEL[r.status] || r.status}</span>
                        {closed && <span style={{ color: P.coral, fontWeight: 700 }}> · Permanently closed{closedOn ? ` (found ${closedOn})` : ""}</span>}
                        {noCuisine && <span style={{ color: "#B4791F", fontWeight: 700 }}> · ⚠ no cuisine</span>}
                      </div>
                    </div>
                    {isPlace && need === "featured" && r.featured && (
                      <span style={{ display: "flex", flexDirection: "column", flexShrink: 0, lineHeight: 1 }}>
                        <button onClick={() => moveFeatured(data.places, r, -1)} title="Move up" style={{ border: "none", background: "transparent", cursor: "pointer", color: P.inkSoft, fontSize: 11, padding: "0 4px" }}>▲</button>
                        <button onClick={() => moveFeatured(data.places, r, 1)} title="Move down" style={{ border: "none", background: "transparent", cursor: "pointer", color: P.inkSoft, fontSize: 11, padding: "0 4px" }}>▼</button>
                      </span>
                    )}
                    {isPlace && (
                      <button onClick={() => patchRow(r.id, { featured: !r.featured })} title={r.featured ? "Featured (rotates in the hero)" : "Feature this pick"}
                        style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 20, lineHeight: 1, color: r.featured ? "#F2B134" : "#D9CEBB", flexShrink: 0 }}>★</button>
                    )}
                    <select value={r.status || "published"} disabled={busy} onChange={(e) => setStatus(r.id, e.target.value)} title="Change visibility"
                      style={{ ...field, width: "auto", padding: "6px 8px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                      {STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    <button onClick={() => setEditing({ ...r, audience: r.audience || [], diet: r.diet || [], cuisine: r.cuisine || [], photos: r.photos || [] })} style={{ ...btn(P.navy), padding: "7px 12px" }}>Edit</button>
                    <button onClick={() => del(r.id, nameOf(r))} style={{ ...btn("transparent"), padding: "7px 10px", color: P.coral, border: `1px solid ${P.coral}55` }}>Delete</button>
                  </div>
                  {isPlace && r.list_key === "rest" && (
                    <div style={{ marginTop: 9, paddingLeft: 53, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                      {CUI_KEYS.map((k) => { const on = (r.cuisine || []).includes(k); const Ic = CUISINES[k].Icon; return (
                        <button key={k} onClick={() => toggleIn(r, "cuisine", k)} style={mini(on, P.coral)}><Ic size={11} /> {CUISINES[k].en}</button>
                      ); })}
                      <span style={{ width: 1, alignSelf: "stretch", background: P.line, margin: "2px 3px" }} />
                      {GOODFOR.map((k) => { const on = (r.cuisine || []).includes(k); const Ic = CUISINES[k].Icon; return (
                        <button key={k} onClick={() => toggleIn(r, "cuisine", k)} style={mini(on, P.green)}><Ic size={11} /> {CUISINES[k].en}</button>
                      ); })}
                      {DIET.map(([k, l, Ic]) => { const on = (r.diet || []).includes(k); return (
                        <button key={k} onClick={() => toggleIn(r, "diet", k)} style={mini(on, P.green)}><Ic size={11} /> {l}</button>
                      ); })}
                    </div>
                  )}
                  {isPlace && (
                    <div style={{ marginTop: 8, paddingLeft: 53, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: P.inkSoft, textTransform: "uppercase", letterSpacing: ".04em" }}>Neighborhood</span>
                      {/* Dropdown of all colonias (via datalist) that also accepts a custom name. Shows the
                          current value; picking the auto value clears the override so it stays automatic. */}
                      <input list="qp-hoods" key={`${r.id}-nb-${r.area || ""}`} defaultValue={nbOverride || nbAuto}
                        placeholder="colonia"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v === nbAuto || v === "") { if (!nbGeneric) patchRow(r.id, { area: null }); }
                          else if (v !== (r.area || "")) patchRow(r.id, { area: v });
                        }}
                        title="Choose a colonia or type a custom name. Leave it on the auto value to stay automatic. A manual value is never changed automatically."
                        style={{ ...field, width: 210, padding: "5px 9px", fontSize: 12.5 }} />
                      <span style={{ fontSize: 11.5, color: nbGeneric ? "#B9AE9C" : P.green, fontWeight: nbGeneric ? 400 : 700 }}>
                        {nbGeneric ? "auto" : "manual"}
                      </span>
                      {!nbGeneric && (
                        <button onClick={() => patchRow(r.id, { area: null })} style={{ border: "none", background: "transparent", color: P.coral, cursor: "pointer", fontSize: 11.5, fontWeight: 700 }}>reset to auto</button>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
              {rows.length === 0 && <p style={{ color: P.inkSoft, fontSize: 14 }}>{ql ? "No matches." : "Nothing here yet. Add one above."}</p>}
            </div>
          </>
        )}

        {editing && (
          <div style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 16, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, margin: 0 }}>{editing.id ? "Edit" : "New"} {isPlace ? "Local Pick" : "event"}</h2>
              <button onClick={() => setEditing(null)} style={{ border: "none", background: "transparent", color: P.inkSoft, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {isPlace ? (
                <>
                  <div style={{ gridColumn: "1 / -1" }}><label style={label}>Name</label><input style={field} value={editing.name || ""} onChange={(e) => upd("name", e.target.value)} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={label}>Description (EN)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={editing.desc_en || ""} onChange={(e) => upd("desc_en", e.target.value)} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={label}>Descripción (ES)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={editing.desc_es || ""} onChange={(e) => upd("desc_es", e.target.value)} /></div>
                  <div><label style={label}>List</label><select style={field} value={editing.list_key || ""} onChange={(e) => upd("list_key", e.target.value)}>{LISTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                  <div><label style={label}>Priority <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(trip planner)</span></label>
                    <select style={field} value={editing.priority ?? ""} onChange={(e) => upd("priority", e.target.value ? Number(e.target.value) : null)}>
                      <option value="">— (optional)</option>
                      <option value="1">1 · Essential (always include)</option>
                      <option value="2">2 · Highly recommended</option>
                      <option value="3">3 · Optional / filler</option>
                    </select>
                  </div>
                  <div><label style={label}>Category</label><select style={field} value={editing.category || ""} onChange={(e) => upd("category", e.target.value)}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                  <div><label style={label}>Audience</label><div style={{ display: "flex", gap: 8, paddingTop: 4 }}>{AUD.map(([k, l]) => <button key={k} onClick={() => toggle("audience", k)} style={chip((editing.audience || []).includes(k), P.navy)}>{l}</button>)}</div></div>
                  <div><label style={label}>Dietary</label><div style={{ display: "flex", gap: 8, paddingTop: 4 }}>{DIET.map(([k, l]) => <button key={k} onClick={() => toggle("diet", k)} style={chip((editing.diet || []).includes(k), P.green)}>{l}</button>)}</div></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={label}>Cuisine <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(restaurant sub-filters)</span></label><div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>{Object.entries(CUISINES).map(([k, v]) => { const Ic = v.Icon; return <button key={k} onClick={() => toggle("cuisine", k)} style={{ ...chip((editing.cuisine || []).includes(k), P.coral), display: "inline-flex", alignItems: "center", gap: 5 }}><Ic size={13} /> {v.en}</button>; })}</div></div>
                  <div><label style={label}>Area</label><input style={field} value={editing.area || ""} onChange={(e) => upd("area", e.target.value)} /></div>
                  <div><label style={label}>Website</label><input style={field} value={editing.origin_url || ""} onChange={(e) => upd("origin_url", e.target.value)} placeholder="https://…" /></div>
                  <div><label style={label}>Phone</label><input style={field} value={editing.phone || ""} onChange={(e) => upd("phone", e.target.value)} placeholder="+52 415 …" /></div>
                  <div><label style={label}>Hours</label><input style={field} value={editing.hours || ""} onChange={(e) => upd("hours", e.target.value)} placeholder="Tue–Sun 1–10pm" /></div>
                  <div><label style={label}>Price</label><select style={field} value={editing.price_level || ""} onChange={(e) => upd("price_level", e.target.value ? Number(e.target.value) : null)}>
                    <option value="">—</option><option value="1">$</option><option value="2">$$</option><option value="3">$$$</option><option value="4">$$$$</option>
                  </select></div>
                  <div><label style={label}>Good to know (EN)</label><input style={field} value={editing.tip || ""} onChange={(e) => upd("tip", e.target.value)} placeholder="reservations, cash only, rooftop…" /></div>
                  <div><label style={label}>Bueno saber (ES)</label><input style={field} value={editing.tip_es || ""} onChange={(e) => upd("tip_es", e.target.value)} placeholder="reservaciones, solo efectivo…" /></div>
                  <div style={{ gridColumn: "1 / -1", borderTop: `1px dashed ${P.line}`, paddingTop: 10, marginTop: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: P.coral }}>Editorial — your hand-picked voice</span>
                    <span style={{ fontSize: 11.5, color: P.inkSoft, marginLeft: 8 }}>(shown on the listing; AI drafts both languages, your edits win)</span>
                  </div>
                  <div><label style={label}>Why we love it (EN)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={editing.why_love || ""} onChange={(e) => upd("why_love", e.target.value)} placeholder="What makes this one special" /></div>
                  <div><label style={label}>Por qué nos encanta (ES)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={editing.why_love_es || ""} onChange={(e) => upd("why_love_es", e.target.value)} placeholder="Por qué es especial" /></div>
                  <div><label style={label}>What to order (EN)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={editing.what_to_order || ""} onChange={(e) => upd("what_to_order", e.target.value)} placeholder="Signature dishes" /></div>
                  <div><label style={label}>Qué pedir (ES)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={editing.what_to_order_es || ""} onChange={(e) => upd("what_to_order_es", e.target.value)} placeholder="Platillos estrella" /></div>
                  <div><label style={label}>Best time to go (EN)</label><input style={field} value={editing.best_time || ""} onChange={(e) => upd("best_time", e.target.value)} placeholder="e.g. sunset for the rooftop" /></div>
                  <div><label style={label}>Mejor momento (ES)</label><input style={field} value={editing.best_time_es || ""} onChange={(e) => upd("best_time_es", e.target.value)} placeholder="p. ej. al atardecer" /></div>
                </>
              ) : (
                <>
                  <div><label style={label}>Title (EN)</label><input style={field} value={editing.title_en || ""} onChange={(e) => upd("title_en", e.target.value)} /></div>
                  <div><label style={label}>Título (ES)</label><input style={field} value={editing.title_es || ""} onChange={(e) => upd("title_es", e.target.value)} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={label}>Blurb (EN)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={editing.blurb_en || ""} onChange={(e) => upd("blurb_en", e.target.value)} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={label}>Descripción (ES)</label><textarea rows={2} style={{ ...field, resize: "vertical" }} value={editing.blurb_es || ""} onChange={(e) => upd("blurb_es", e.target.value)} /></div>
                  <div><label style={label}>Category</label><select style={field} value={editing.category || ""} onChange={(e) => upd("category", e.target.value)}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                  <div><label style={label}>Audience</label><div style={{ display: "flex", gap: 8, paddingTop: 4 }}>{AUD.map(([k, l]) => <button key={k} onClick={() => toggle("audience", k)} style={chip((editing.audience || []).includes(k), P.navy)}>{l}</button>)}</div></div>
                  <div><label style={label}>Start date</label><input type="date" style={field} value={editing.start_date || ""} onChange={(e) => upd("start_date", e.target.value)} /></div>
                  <div><label style={label}>End date</label><input type="date" style={field} value={editing.end_date || ""} onChange={(e) => upd("end_date", e.target.value)} /></div>
                  <div><label style={label}>Time</label><input placeholder="19:00" style={field} value={editing.start_time || ""} onChange={(e) => upd("start_time", e.target.value)} /></div>
                  <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}><label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, cursor: "pointer" }}><input type="checkbox" checked={!!editing.recurring} onChange={(e) => upd("recurring", e.target.checked)} /> Recurring</label></div>
                  <div><label style={label}>Price (EN)</label><input style={field} value={editing.price_en || ""} onChange={(e) => upd("price_en", e.target.value)} /></div>
                  <div><label style={label}>Venue</label><input style={field} value={editing.venue || ""} onChange={(e) => upd("venue", e.target.value)} /></div>
                  <div><label style={label}>Area</label><input style={field} value={editing.area || ""} onChange={(e) => upd("area", e.target.value)} /></div>
                  <div><label style={label}>Source URL</label><input style={field} value={editing.origin_url || ""} onChange={(e) => upd("origin_url", e.target.value)} /></div>
                </>
              )}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={label}>
                  Location {editing.lat != null && editing.lng != null
                    ? <span style={{ color: P.green, fontWeight: 700, textTransform: "none", letterSpacing: 0 }}>· pinned</span>
                    : <span style={{ color: "#B4791F", fontWeight: 700, textTransform: "none", letterSpacing: 0 }}>· no pin yet</span>}
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
                  <input style={field} placeholder="Latitude (e.g. 20.9145)" value={editing.lat ?? ""}
                    onChange={(e) => upd("lat", e.target.value === "" ? null : Number(e.target.value))} />
                  <input style={field} placeholder="Longitude (e.g. -100.7436)" value={editing.lng ?? ""}
                    onChange={(e) => upd("lng", e.target.value === "" ? null : Number(e.target.value))} />
                  {editing.lat != null && editing.lng != null
                    ? <a href={`https://www.google.com/maps/search/?api=1&query=${editing.lat},${editing.lng}`} target="_blank" rel="noreferrer"
                        style={{ fontSize: 12.5, fontWeight: 700, color: P.coral, textDecoration: "none", whiteSpace: "nowrap" }}>Preview ↗</a>
                    : <span />}
                </div>
                <input style={{ ...field, marginTop: 6 }} value={coordPaste}
                  placeholder="Or paste a Google Maps link / 'lat, lng' here to autofill"
                  onChange={(e) => {
                    const v = e.target.value; setCoordPaste(v);
                    const c = parseCoords(v);
                    if (c) { upd("lat", c[0]); upd("lng", c[1]); setCoordPaste(""); }
                  }} />
                <p style={{ fontSize: 11.5, color: P.inkSoft, margin: "6px 0 0" }}>
                  Manual coordinates are never overwritten by automatic jobs. Clear both fields to un-pin.
                </p>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={label}>{isPlace ? "Main photo (card thumbnail)" : "Photo"}</label>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <label
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => { e.preventDefault(); if (!uploading) uploadPhoto(e.dataTransfer.files); }}
                    style={{ width: 132, height: 100, flexShrink: 0, borderRadius: 10, border: `2px dashed ${P.line}`, background: "#FBF9F5", display: "grid", placeItems: "center", cursor: uploading ? "wait" : "pointer", overflow: "hidden", textAlign: "center", position: "relative" }}>
                    {editing.photo_url
                      ? <img src={editing.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 12, color: P.inkSoft, padding: 6 }}>{uploading ? "Uploading…" : "Drop or click to upload"}</span>}
                    <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading}
                      onChange={(e) => { uploadPhoto(e.target.files); e.target.value = ""; }} />
                  </label>
                  <div style={{ flex: 1 }}>
                    <input style={field} value={editing.photo_url || ""} onChange={(e) => upd("photo_url", e.target.value)} placeholder="…or paste an image URL" />
                    <p style={{ fontSize: 11.5, color: P.inkSoft, margin: "6px 0 0" }}>JPG/PNG/WebP, up to 8 MB. Uploads go to Supabase Storage. {editing.photo_url && <button type="button" onClick={() => upd("photo_url", "")} style={{ border: "none", background: "transparent", color: P.coral, cursor: "pointer", fontSize: 11.5, fontWeight: 700, padding: 0 }}>Clear</button>}</p>
                  </div>
                </div>
              </div>
              {isPlace && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={label}>Gallery <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(extra photos in the detail view)</span></label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(editing.photos || []).map((url) => (
                      <div key={url} style={{ position: "relative", width: 84, height: 64, borderRadius: 8, overflow: "hidden", border: `1px solid ${P.line}` }}>
                        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={() => removePhoto(url)} aria-label="Remove"
                          style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 12, lineHeight: "18px", padding: 0 }}>×</button>
                      </div>
                    ))}
                    <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (!uploading) uploadGallery(e.dataTransfer.files); }}
                      style={{ width: 84, height: 64, borderRadius: 8, border: `2px dashed ${P.line}`, background: "#FBF9F5", display: "grid", placeItems: "center", cursor: uploading ? "wait" : "pointer", fontSize: 22, color: P.inkSoft }}>
                      +
                      <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading}
                        onChange={(e) => { uploadGallery(e.target.files); e.target.value = ""; }} />
                    </label>
                  </div>
                </div>
              )}
              <div><label style={label}>Status</label><select style={field} value={editing.status || "published"} onChange={(e) => upd("status", e.target.value)}>{STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              {isPlace && (
                <div><label style={label}>Open / closed <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(auto-checked from Google)</span></label>
                  <select style={field} value={editing.business_status || "OPERATIONAL"} onChange={(e) => upd("business_status", e.target.value)}>{BIZ_STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              )}
            </div>
            <button onClick={save} disabled={busy} style={{ ...btn(P.coral, !busy), marginTop: 16, width: "100%", padding: 13, fontSize: 15 }}>{busy ? "Saving…" : "Save"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
