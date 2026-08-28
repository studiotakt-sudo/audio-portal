-- ════════════════════════════════════════════════════════════════
-- Cypher Cache — Phase 8 (client self-signup + approval gate)
-- Run in the Supabase SQL editor. Safe to run more than once.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Approval flag ─────────────────────────────────────────────
alter table clients add column if not exists approved boolean not null default false;
update clients set approved = true where approved is distinct from true;

-- ── 2. Approval-aware client id ──────────────────────────────────
-- Making current_client_id() return an id ONLY for approved clients means every
-- existing track/event policy automatically denies unapproved signups.
create or replace function public.current_client_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from clients where user_id = auth.uid() and approved = true;
$$;

-- ── 3. Let a new user create THEIR OWN pending profile at signup ──
drop policy if exists clients_self_signup on clients;
create policy clients_self_signup on clients for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'client'
    and approved = false
  );

-- ── 4. Index for the admin "pending" list ────────────────────────
create index if not exists idx_clients_approved on clients(approved);
