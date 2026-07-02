-- ════════════════════════════════════════════════════════════════
-- Cypher Cache — Phase 5 (composers / roster attribution)
-- Run in the Supabase SQL editor BEFORE deploying the Phase 5 code.
-- Safe to run more than once (idempotent).
-- ════════════════════════════════════════════════════════════════

create table if not exists composers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text default '',
  image_path text default '',         -- optional, for a future composer page
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Each track credits one composer. ON DELETE SET NULL: removing a composer
-- leaves their tracks intact, just uncredited (does NOT delete the tracks).
alter table tracks add column if not exists composer_id uuid references composers(id) on delete set null;
create index if not exists idx_tracks_composer on tracks(composer_id);

-- Seed the first roster member so existing tracks can be back-credited.
insert into composers (name, sort_order)
select 'Barry', 1
where not exists (select 1 from composers where lower(name) = 'barry');

-- OPTIONAL — back-credit ALL existing tracks to Barry in one go.
-- Run this only if every current track is yours (uncomment to use):
--
-- update tracks
-- set composer_id = (select id from composers where lower(name) = 'barry' limit 1)
-- where composer_id is null;
