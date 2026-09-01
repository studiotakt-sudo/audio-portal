-- ════════════════════════════════════════════════════════════════
-- Cypher Cache — Phase 11 (client contact form)
-- Run in the Supabase SQL editor. Idempotent.
--
-- Stores messages clients send via the floating contact form. A client can
-- INSERT their own message; only admins can read them. The edge function also
-- emails each message to the studio.
-- ════════════════════════════════════════════════════════════════

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  name text,
  company text,
  email text,
  message text not null,
  created_at timestamptz default now(),
  handled boolean not null default false   -- admin can mark as dealt-with
);
create index if not exists idx_contact_created on contact_messages(created_at desc);

alter table contact_messages enable row level security;

-- A logged-in client may insert a message for THEIR OWN client row only.
drop policy if exists contact_insert on contact_messages;
create policy contact_insert on contact_messages for insert to authenticated
  with check ( client_id = current_client_id() or is_admin() );

-- Only admins can read / update / delete messages.
drop policy if exists contact_admin_read on contact_messages;
create policy contact_admin_read on contact_messages for select to authenticated
  using ( is_admin() );
drop policy if exists contact_admin_write on contact_messages;
create policy contact_admin_write on contact_messages for update to authenticated
  using ( is_admin() ) with check ( is_admin() );
drop policy if exists contact_admin_delete on contact_messages;
create policy contact_admin_delete on contact_messages for delete to authenticated
  using ( is_admin() );
