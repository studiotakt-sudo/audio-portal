// ════════════════════════════════════════════════════════════════
// Cypher Cache — admin-users edge function
//
// User management needs the SERVICE ROLE key (creating/deleting auth
// users, setting passwords). That key must never reach the browser,
// so those operations live here. Every request is verified against
// the caller's JWT: only a signed-in user whose clients.role = 'admin'
// gets through.
//
// Deploy:  supabase functions deploy admin-users
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// Actions (POST JSON body):
//   { action: 'create_user',    name, email, password, role }   role: 'client' | 'admin'
//   { action: 'reset_password', client_id, password }
//   { action: 'delete_user',    client_id }
// ════════════════════════════════════════════════════════════════

import { createClient } from "npm:@supabase/supabase-js@2";

const PROTECTED_ADMIN_EMAIL = "cypher@cypher.audio";
const MIN_PASSWORD_LENGTH = 8;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // ── Verify the caller is a signed-in admin ──────────────────
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Not authenticated" }, 401);

    const { data: caller } = await admin
      .from("clients")
      .select("id, role, email")
      .eq("user_id", userData.user.id)
      .single();
    if (!caller || caller.role !== "admin") return json({ error: "Admin access required" }, 403);

    const body = await req.json();
    const action = body?.action;

    // ── create_user ─────────────────────────────────────────────
    if (action === "create_user") {
      const name = (body.name ?? "").trim();
      const email = (body.email ?? "").trim().toLowerCase();
      const password = body.password ?? "";
      const role = body.role;

      if (!name) return json({ error: "Name is required" }, 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "A valid email is required" }, 400);
      if (password.length < MIN_PASSWORD_LENGTH) {
        return json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400);
      }
      if (role !== "client" && role !== "admin") return json({ error: "Invalid role" }, 400);

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (cErr) {
        const msg = /already/i.test(cErr.message) ? "That email is already in use" : cErr.message;
        return json({ error: msg }, 400);
      }

      const { error: iErr } = await admin
        .from("clients")
        .insert({ name, email, role, user_id: created.user.id });
      if (iErr) {
        // Roll back the orphaned auth user so email isn't burned.
        await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
        const msg = iErr.message?.includes("idx_clients_email_unique")
          ? "That email is already in use"
          : iErr.message;
        return json({ error: msg }, 400);
      }
      return json({ ok: true });
    }

    // ── reset_password ──────────────────────────────────────────
    if (action === "reset_password") {
      const { client_id, password } = body;
      if (!client_id) return json({ error: "client_id is required" }, 400);
      if (!password || password.length < MIN_PASSWORD_LENGTH) {
        return json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400);
      }
      const { data: row } = await admin
        .from("clients")
        .select("user_id")
        .eq("id", client_id)
        .single();
      if (!row?.user_id) {
        return json({ error: "No auth account is linked to this user yet — run the migration script" }, 400);
      }
      const { error } = await admin.auth.admin.updateUserById(row.user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ── delete_user ─────────────────────────────────────────────
    if (action === "delete_user") {
      const { client_id } = body;
      if (!client_id) return json({ error: "client_id is required" }, 400);
      const { data: row } = await admin
        .from("clients")
        .select("id, user_id, email")
        .eq("id", client_id)
        .single();
      if (!row) return json({ error: "Account not found" }, 404);
      if ((row.email ?? "").toLowerCase() === PROTECTED_ADMIN_EMAIL) {
        return json({ error: "The base admin cannot be removed" }, 400);
      }
      if (row.id === caller.id) {
        return json({ error: "You can't remove the account you're logged in as" }, 400);
      }
      await admin.from("clients").delete().eq("id", client_id);
      if (row.user_id) await admin.auth.admin.deleteUser(row.user_id).catch(() => {});
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
