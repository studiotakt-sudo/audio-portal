-- ════════════════════════════════════════════════════════════════
-- Cypher Cache — Phase 9 (invite-code signup + company field)
-- Run in the Supabase SQL editor AFTER phase8_signup.sql. Idempotent.
--
-- Signup now lives at /signup?code=XXXX. The code must match an active,
-- unexpired row in signup_codes. Company is captured on the client profile.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Company on the client profile ─────────────────────────────
alter table clients add column if not exists company text default '';

-- ── 2. Signup codes ──────────────────────────────────────────────
create table if not exists signup_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label text default '',            -- who/what this code was for (admin's memory)
  active boolean not null default true,
  expires_at timestamptz,           -- null = never expires
  created_at timestamptz default now()
);
create index if not exists idx_signup_codes_code on signup_codes(code);

-- ── 3. Validation helper (SECURITY DEFINER) ──────────────────────
-- Lets the signup page check a code WITHOUT being able to read the codes table.
-- Returns true only for an active, unexpired code. Runs as definer so anon can
-- call it without select access to signup_codes.
create or replace function public.check_signup_code(p_code text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from signup_codes
    where code = p_code
      and active = true
      and (expires_at is null or expires_at > now())
  );
$$;

-- anon (not-yet-signed-in visitors) may call the checker, but cannot read,
-- insert, update, or list codes.
revoke all on function public.check_signup_code(text) from public;
grant execute on function public.check_signup_code(text) to anon, authenticated;

-- ── 4. RLS on signup_codes — admin-only for everything else ──────
alter table signup_codes enable row level security;
drop policy if exists signup_codes_admin on signup_codes;
create policy signup_codes_admin on signup_codes for all to authenticated
  using (is_admin()) with check (is_admin());
-- No anon policy at all: the anon key cannot touch this table directly.
-- Validation happens only through check_signup_code().

-- ── 5. A starter code so you can test immediately ────────────────
insert into signup_codes (code, label)
values ('CYPHER-WELCOME', 'Initial test code — change or expire me')
on conflict (code) do nothing;
