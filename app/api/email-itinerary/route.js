import { getGoogleToken } from "../../../lib/google";

export const runtime = "nodejs";
export const maxDuration = 60;

// Email a generated itinerary to the visitor, sent from the Workspace inbox
// (NEWSLETTER_INBOX) via the Gmail API. Setup owed once: authorize the service account
// for scope https://www.googleapis.com/auth/gmail.send in the Admin console (add it to
// the existing domain-wide delegation), same as gmail.modify.
const SCOPE = "https://www.googleapis.com/auth/gmail.send";
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function itineraryHtml(itin, es) {
  const slotLabel = { morning: es ? "Mañana" : "Morning", cafe: es ? "Café" : "Coffee", lunch: es ? "Comida" : "Lunch", afternoon: es ? "Tarde" : "Afternoon", dinner: es ? "Cena" : "Dinner", evening: es ? "Noche" : "Evening" };
  const days = (itin.days || []).map((d) => {
    const items = (d.items || []).map((it) => `
      <tr><td style="padding:6px 10px 6px 0;white-space:nowrap;color:#E06A63;font-weight:700;font-size:12px;vertical-align:top">${esc(slotLabel[it.slot] || it.slot)}</td>
      <td style="padding:6px 0"><b style="color:#241C14">${esc(it.name)}</b>${it.why ? `<div style="color:#6E604F;font-size:13px">${esc(it.why)}</div>` : ""}</td></tr>`).join("");
    return `<h3 style="font-family:Georgia,serif;color:#0D1B36;margin:22px 0 6px">${es ? "Día" : "Day"} ${d.day}${d.title ? " · " + esc(d.title) : ""}</h3><table style="width:100%;border-collapse:collapse">${items}</table>`;
  }).join("");
  return `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#241C14">
    <div style="height:6px;background:repeating-linear-gradient(135deg,#15539A 0 8px,transparent 8px 16px),repeating-linear-gradient(45deg,#E11D74 0 8px,#F2A100 8px 16px)"></div>
    <div style="padding:20px 22px">
      <p style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#B4791F;margin:0 0 4px">Vamos San Miguel · ${es ? "Tu viaje" : "Your trip"}</p>
      ${itin.summary ? `<p style="font-size:15px;line-height:1.55;color:#3A3125">${esc(itin.summary)}</p>` : ""}
      ${days}
      <p style="margin-top:26px;font-size:13px;color:#6E604F">${es ? "Hecho con" : "Made with"} <a href="https://www.vamossanmiguel.com" style="color:#E06A63;text-decoration:none;font-weight:700">Vamos San Miguel</a>.</p>
    </div></div>`;
}

export async function POST(req) {
  const inbox = process.env.NEWSLETTER_INBOX;
  if (!inbox) return Response.json({ ok: false, error: "NEWSLETTER_INBOX not configured" }, { status: 500 });
  const { to, itinerary, lang } = await req.json().catch(() => ({}));
  const es = lang === "es";
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return Response.json({ ok: false, error: "Valid email required" }, { status: 400 });
  if (!itinerary || !itinerary.days?.length) return Response.json({ ok: false, error: "No itinerary" }, { status: 400 });

  let token;
  try { token = await getGoogleToken(SCOPE, inbox); }
  catch (e) { return Response.json({ ok: false, error: "Gmail auth failed (gmail.send authorized?): " + String(e.message || e) }, { status: 500 }); }

  const subject = es ? "Tu itinerario de San Miguel de Allende" : "Your San Miguel de Allende itinerary";
  const html = itineraryHtml(itinerary, es);
  const raw = [
    `From: Vamos San Miguel <${inbox}>`, `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`,
    "MIME-Version: 1.0", 'Content-Type: text/html; charset="UTF-8"', "", html,
  ].join("\r\n");
  const encoded = Buffer.from(raw, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_");

  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!r.ok) { const b = await r.text().catch(() => ""); return Response.json({ ok: false, error: `send ${r.status}: ${b.slice(0, 180)}` }, { status: 500 }); }
  return Response.json({ ok: true, sent: true });
}
