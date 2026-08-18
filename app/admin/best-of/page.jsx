"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

const P = { plaster: "#F7F1E5", card: "#FFFFFF", ink: "#0D1B36", inkSoft: "#6B6152", line: "#E7DDCB", coral: "#E06A63", green: "#3F8F6B", navy: "#15539A", chipBg: "#F0EADE", gold: "#B4791F" };
const btn = (bg, on = true) => ({ border: "none", cursor: on ? "pointer" : "default", background: on ? bg : P.inkSoft, color: "#fff", fontWeight: 700, fontSize: 13, padding: "7px 13px", borderRadius: 10 });
const field = { width: "100%", padding: "9px 11px", borderRadius: 9, border: `1px solid ${P.line}`, fontSize: 14, fontFamily: "inherit", color: P.ink, background: "#fff", boxSizing: "border-box" };

// A place typeahead: type a name, get Google autocomplete predictions, click one to
// add-place (link existing OR add new), then hand the resulting place id to onPick.
function PlacePicker({ pw, placeholder, onPick }) {
  const [q, setQ] = useState("");
  const [preds, setPreds] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const input = q.trim();
    if (input.length < 2) { setPreds([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch("/api/place-autocomplete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, q: input }) });
        const j = await r.json();
        setPreds(j.predictions || []); setOpen(true);
      } catch { setPreds([]); }
    }, 250);
    return () => timer.current && clearTimeout(timer.current);
  }, [q, pw]);

  async function pick(pred) {
    setSaving(true); setErr(""); setOpen(false);
    try {
      const r = await fetch("/api/add-place", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, place_id: pred.place_id }) });
      const j = await r.json();
      const id = j.place?.id || j.id;
      if (!id) throw new Error(j.error || "Could not add place");
      await onPick(id);
      setQ(""); setPreds([]);
    } catch (e) { setErr(String(e.message || e)); }
    setSaving(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} disabled={saving}
        onFocus={() => preds.length && setOpen(true)} style={field} />
      {saving && <span style={{ fontSize: 12, color: P.inkSoft }}>Saving…</span>}
      {err && <span style={{ fontSize: 12, color: P.coral }}>{err}</span>}
      {open && preds.length > 0 && (
        <div style={{ position: "absolute", zIndex: 10, left: 0, right: 0, top: "calc(100% + 4px)", background: "#fff", border: `1px solid ${P.line}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)", overflow: "hidden" }}>
          {preds.map((pred) => (
            <button key={pred.place_id} onClick={() => pick(pred)}
              style={{ display: "block", width: "100%", textAlign: "left", border: "none", borderBottom: `1px solid ${P.line}`, background: "#fff", cursor: "pointer", padding: "9px 12px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: P.ink }}>{pred.main}</div>
              {pred.secondary && <div style={{ fontSize: 12, color: P.inkSoft }}>{pred.secondary}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlaceChip({ place, kind, onRemove }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: P.chipBg, border: `1px solid ${P.line}`, borderRadius: 10, padding: "5px 8px" }}>
      {place.photo_url && <img src={place.photo_url} alt="" style={{ width: 34, height: 34, borderRadius: 7, objectFit: "cover" }} />}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: P.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {kind === "winner" && <span style={{ color: P.gold }}>🏆 </span>}{place.name}
        </div>
        {place.area && <div style={{ fontSize: 11.5, color: P.inkSoft }}>{place.area}</div>}
      </div>
      {onRemove && <button onClick={onRemove} title="Remove" style={{ marginLeft: "auto", border: "none", background: "transparent", color: P.coral, cursor: "pointer", fontSize: 15, fontWeight: 800 }}>×</button>}
    </div>
  );
}

export default function BestOfAdmin() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [cats, setCats] = useState([]);
  const [msg, setMsg] = useState("");
  const [nc, setNc] = useState({ slug: "", label_en: "", label_es: "", sort: "" });

  const api = useCallback(async (body) => {
    const r = await fetch("/api/best-of", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, ...body }) });
    const j = await r.json();
    if (!r.ok || j.ok === false) throw new Error(j.error || "Failed");
    return j;
  }, [pw]);

  const load = useCallback(async () => {
    try { const j = await api({ action: "list-admin" }); setCats(j.categories || []); setMsg(""); }
    catch (e) { setMsg(String(e.message || e)); }
  }, [api]);

  useEffect(() => { const s = sessionStorage.getItem("qp_admin_pw"); if (s) { setPw(s); setAuthed(true); } }, []);
  useEffect(() => { if (authed) load(); }, [authed, load]);

  async function setWinner(slug, place_id) {
    try { await api({ action: "set-winner", slug, place_id }); await load(); }
    catch (e) { setMsg(String(e.message || e)); }
  }
  async function addRunner(cat, place_id) {
    const ids = [...(cat.runners || []).map((r) => r.id), place_id].filter(Boolean).slice(0, 3);
    try { await api({ action: "set-runners", slug: cat.slug, ids }); await load(); }
    catch (e) { setMsg(String(e.message || e)); }
  }
  async function removeRunner(cat, place_id) {
    const ids = (cat.runners || []).map((r) => r.id).filter((id) => id !== place_id);
    try { await api({ action: "set-runners", slug: cat.slug, ids }); await load(); }
    catch (e) { setMsg(String(e.message || e)); }
  }
  async function addCategory() {
    if (!nc.slug.trim() || !nc.label_en.trim()) { setMsg("Slug and English label are required."); return; }
    try { await api({ action: "upsert-category", slug: nc.slug.trim(), label_en: nc.label_en.trim(), label_es: nc.label_es.trim(), sort: nc.sort }); setNc({ slug: "", label_en: "", label_es: "", sort: "" }); await load(); }
    catch (e) { setMsg(String(e.message || e)); }
  }
  async function delCategory(cat) {
    if (!confirm(`Delete category "${cat.label_en}"? This cannot be undone.`)) return;
    try { await api({ action: "delete-category", slug: cat.slug }); await load(); }
    catch (e) { setMsg(String(e.message || e)); }
  }

  if (!authed) {
    return (
      <div style={{ background: P.plaster, minHeight: "100vh", padding: "60px 20px", fontFamily: "system-ui" }}>
        <div style={{ maxWidth: 340, margin: "0 auto", background: P.card, border: `1px solid ${P.line}`, borderRadius: 14, padding: 20 }}>
          <h1 style={{ fontSize: 18, margin: "0 0 12px", color: P.ink }}>Best of — crown the winners</h1>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Admin password"
            onKeyDown={(e) => { if (e.key === "Enter") { sessionStorage.setItem("qp_admin_pw", pw); setAuthed(true); } }}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${P.line}`, fontSize: 14, marginBottom: 10 }} />
          <button onClick={() => { sessionStorage.setItem("qp_admin_pw", pw); setAuthed(true); }} style={btn(P.coral)}>Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: P.plaster, minHeight: "100vh", padding: "24px 20px", fontFamily: "system-ui", color: P.ink }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <Link href="/admin" style={{ color: P.coral, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>← Back to admin</Link>
        <h1 style={{ fontSize: 26, fontFamily: "Georgia, serif", margin: "6px 0 6px" }}>Best of San Miguel</h1>
        <p style={{ fontSize: 13.5, color: P.inkSoft, margin: "0 0 16px" }}>For each intent, crown THE winner and up to 3 runners-up. Type a place name to link an existing pick or add a new one from Google in one step.</p>
        {msg && <p style={{ color: P.coral, fontSize: 13.5 }}>{msg}</p>}

        <div style={{ display: "grid", gap: 16 }}>
          {cats.map((cat) => (
            <div key={cat.slug} style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 16.5, fontWeight: 800 }}>{cat.label_en}</div>
                  {cat.label_es && <div style={{ fontSize: 12.5, color: P.inkSoft }}>{cat.label_es}</div>}
                  <div style={{ fontSize: 11, color: P.inkSoft, marginTop: 2 }}>{cat.slug} · sort {cat.sort}{cat.status !== "published" ? ` · ${cat.status}` : ""}</div>
                </div>
                <button onClick={() => delCategory(cat)} style={{ ...btn("transparent"), color: P.coral, border: `1px solid ${P.coral}55` }}>Delete</button>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: P.inkSoft, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Winner</div>
                {cat.winner ? <PlaceChip place={cat.winner} kind="winner" /> : <div style={{ fontSize: 13, color: P.inkSoft, fontStyle: "italic" }}>No winner yet.</div>}
                <div style={{ marginTop: 8 }}>
                  <PlacePicker pw={pw} placeholder="Set the winner — type a place name…" onPick={(id) => setWinner(cat.slug, id)} />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: P.inkSoft, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Runners-up ({(cat.runners || []).length}/3)</div>
                {(cat.runners || []).length > 0 && (
                  <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
                    {cat.runners.map((r) => <PlaceChip key={r.id} place={r} kind="runner" onRemove={() => removeRunner(cat, r.id)} />)}
                  </div>
                )}
                {(cat.runners || []).length < 3
                  ? <PlacePicker pw={pw} placeholder="Add a runner-up — type a place name…" onPick={(id) => addRunner(cat, id)} />
                  : <div style={{ fontSize: 12.5, color: P.inkSoft }}>Max of 3 runners-up. Remove one to add another.</div>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, background: P.card, border: `1px solid ${P.line}`, borderRadius: 14, padding: 16 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 10px" }}>Add a category</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={{ fontSize: 12, fontWeight: 700, color: P.inkSoft }}>Slug (snake_case)</label><input style={field} value={nc.slug} onChange={(e) => setNc({ ...nc, slug: e.target.value })} placeholder="best_brunch" /></div>
            <div><label style={{ fontSize: 12, fontWeight: 700, color: P.inkSoft }}>Sort</label><input style={field} type="number" value={nc.sort} onChange={(e) => setNc({ ...nc, sort: e.target.value })} placeholder="100" /></div>
            <div><label style={{ fontSize: 12, fontWeight: 700, color: P.inkSoft }}>Label (EN)</label><input style={field} value={nc.label_en} onChange={(e) => setNc({ ...nc, label_en: e.target.value })} placeholder="Best brunch" /></div>
            <div><label style={{ fontSize: 12, fontWeight: 700, color: P.inkSoft }}>Label (ES, optional)</label><input style={field} value={nc.label_es} onChange={(e) => setNc({ ...nc, label_es: e.target.value })} placeholder="Mejor brunch" /></div>
          </div>
          <button onClick={addCategory} style={{ ...btn(P.navy), marginTop: 12 }}>Add category</button>
        </div>
      </div>
    </div>
  );
}
