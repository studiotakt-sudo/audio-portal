-- ════════════════════════════════════════════════════════════════
-- Cypher Cache — Phase 9 (invite-code signup + company field)
-- Run AFTER phase8_signup.sql. Idempotent.
-- ════════════════════════════════════════════════════════════════

alter table clients add column if not exists company text default '';

create table if not exists signup_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label text default '',
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_signup_codes_code on signup_codes(code);

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

revoke all on function public.check_signup_code(text) from public;
grant execute on function public.check_signup_code(text) to anon, authenticated;

alter table signup_codes enable row level security;
drop policy if exists signup_codes_admin on signup_codes;
create policy signup_codes_admin on signup_codes for all to authenticated
  using (is_admin()) with check (is_admin());

insert into signup_codes (code, label)
values ('CYPHER-WELCOME', 'Initial test code — change or expire me')
on conflict (code) do nothing;
