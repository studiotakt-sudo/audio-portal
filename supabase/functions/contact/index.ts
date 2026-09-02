// ════════════════════════════════════════════════════════════════
// Cypher Cache — contact edge function
//
// Called by the client app when someone submits the floating contact form.
// Emails the studio the message (via Resend). The row is also saved to
// contact_messages by the client insert; this function only handles email.
//
// Secrets required (Edge Functions → contact → Secrets):
//   RESEND_API_KEY   your Resend API key
//   NOTIFY_TO        one or more inboxes, comma-separated
//   NOTIFY_FROM      verified sender, e.g. noreply@contact.cyphercache.music
//
// Expects a JSON body: { name, company, email, message }
// ════════════════════════════════════════════════════════════════

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const NOTIFY_TO   = Deno.env.get("NOTIFY_TO") ?? "";
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? "noreply@contact.cyphercache.music";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  console.log("contact function invoked — method:", req.method);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("POST only", { status: 405, headers: CORS });

  // Log config presence (not the values) so we can see if secrets are readable.
  console.log("config check — RESEND_API_KEY set:", !!RESEND_API_KEY, "NOTIFY_TO set:", !!NOTIFY_TO, "NOTIFY_FROM:", NOTIFY_FROM);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad payload" }), { status: 400, headers: CORS });
  }

  const kind    = (body?.kind || "request").toString();
  const name    = (body?.name    || "(no name)").toString().slice(0, 200);
  const company = (body?.company || "(no company)").toString().slice(0, 200);
  const email   = (body?.email   || "(no email)").toString().slice(0, 200);
  const message = (body?.message || "").toString().slice(0, 5000);

  const isLicensing = kind === "licensing";
  const label = isLicensing ? "Licensing enquiry" : "Track request";

  if (!message.trim()) {
    return new Response(JSON.stringify({ error: "empty message" }), { status: 400, headers: CORS });
  }

  const recipients = NOTIFY_TO.split(",").map((s) => s.trim()).filter(Boolean);
  if (!RESEND_API_KEY || recipients.length === 0) {
    console.error("contact: missing RESEND_API_KEY or NOTIFY_TO");
    return new Response(JSON.stringify({ error: "not configured" }), { status: 200, headers: CORS });
  }

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html =
    `<p><strong>${label} from a client</strong></p>` +
    `<p>From: ${esc(name)} (${esc(company)})<br>Email: ${esc(email)}</p>` +
    `<hr><p style="white-space:pre-wrap">${esc(message)}</p>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: recipients,
        reply_to: email && email.includes("@") ? email : undefined,
        subject: `Cypher Cache — ${label} from ${name}`,
        html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("contact: Resend error", res.status, detail);
      return new Response(JSON.stringify({ error: "resend failed", detail }), { status: 200, headers: CORS });
    }
  } catch (e) {
    console.error("contact: fetch threw", e);
    return new Response(JSON.stringify({ error: "exception" }), { status: 200, headers: CORS });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS });
});
