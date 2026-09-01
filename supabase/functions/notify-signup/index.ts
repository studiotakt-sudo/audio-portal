// ════════════════════════════════════════════════════════════════
// Cypher Cache — notify-signup edge function
//
// Fired by a Supabase Database Webhook on INSERT into `clients`.
// Sends the studio an email (via Resend) that someone requested access,
// including their name, company, and email so you know who to approve.
//
// Deploy:  supabase functions deploy notify-signup
//
// Secrets to set (Supabase → Edge Functions → notify-signup → Secrets, or CLI):
//   RESEND_API_KEY   your Resend API key
//   NOTIFY_TO        the inbox that should receive signup alerts
//   NOTIFY_FROM      verified sender, e.g. noreply@contact.cyphercache.music
//
// The webhook must be set to skip auth (or include the anon key) — see setup notes.
// ════════════════════════════════════════════════════════════════

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const NOTIFY_TO   = Deno.env.get("NOTIFY_TO") ?? "";
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? "noreply@contact.cyphercache.music";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad payload", { status: 400 });
  }

  // Supabase DB webhooks send { type, table, record, old_record }.
  // Only act on new client rows.
  if (payload?.type !== "INSERT") {
    return new Response(JSON.stringify({ skipped: "not an insert" }), { status: 200 });
  }
  const row = payload.record ?? {};

  // Only clients (ignore admins created through the admin panel).
  if (row.role && row.role !== "client") {
    return new Response(JSON.stringify({ skipped: "not a client" }), { status: 200 });
  }

  const name    = row.name    || "(no name)";
  const company = row.company || "(no company)";
  const email   = row.email   || "(no email)";

  if (!RESEND_API_KEY || !NOTIFY_TO) {
    // Misconfigured secrets — log and exit cleanly so the insert isn't affected.
    console.error("notify-signup: missing RESEND_API_KEY or NOTIFY_TO");
    return new Response(JSON.stringify({ error: "not configured" }), { status: 200 });
  }

  const html =
    `<p><strong>New signup awaiting approval</strong></p>` +
    `<p>Name: ${name}<br>Company: ${company}<br>Email: ${email}</p>` +
    `<p>Open the admin panel → Clients tab to approve or reject them.</p>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: NOTIFY_TO.split(",").map((s) => s.trim()).filter(Boolean),
        subject: "New Cypher Cache signup",
        html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("notify-signup: Resend error", res.status, detail);
      return new Response(JSON.stringify({ error: "resend failed", detail }), { status: 200 });
    }
  } catch (e) {
    console.error("notify-signup: fetch threw", e);
    return new Response(JSON.stringify({ error: "exception" }), { status: 200 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
