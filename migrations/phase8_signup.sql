-- ════════════════════════════════════════════════════════════════
-- Cypher Cache — Phase 8 (client self-signup + approval gate)
-- Run in the Supabase SQL editor. Safe to run more than once.
--
-- Adds an `approved` gate so anyone can sign up, but a new signup sees
-- NOTHING until an admin approves them. Enforced in the database via RLS,
-- so it can't be bypassed from the browser.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Approval flag ─────────────────────────────────────────────
alter table clients add column if not exists approved boolean not null default false;

-- Existing clients are already trusted — approve them all so nothing breaks.
-- (New rows created after this migration default to false.)
update clients set approved = true where approved is distinct from true;

-- ── 2. Approval-aware client id ──────────────────────────────────
-- current_client_id() is the linchpin of every track/event policy. By making
-- it return an id ONLY for approved clients, an unapproved signup is invisible
-- to every existing policy automatically — no other policy needs to change.
create or replace function public.current_client_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from clients where user_id = auth.uid() and approved = true;
$$;

-- Admins are unaffected: their access flows through is_admin(), which does not
-- depend on current_client_id(). An admin row should of course be approved too,
-- which the update above already handled.

-- ── 3. Let a new user create THEIR OWN pending profile at signup ──
-- Tightly scoped: a signed-in user may insert exactly one clients row, only
-- for their own auth id, only as an unapproved client. They cannot self-approve
-- or set role=admin (the WITH CHECK forbids it), and cannot touch anyone else.
drop policy if exists clients_self_signup on clients;
create policy clients_self_signup on clients for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'client'
    and approved = false
  );

-- Note: the existing clients_update policy already restricts UPDATE to admins,
-- so a user cannot flip their own approved flag. Approval happens admin-side.

-- ── 4. (Optional) index for the admin "pending" list ─────────────
create index if not exists idx_clients_approved on clients(approved);
