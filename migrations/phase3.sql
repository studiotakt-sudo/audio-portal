-- ════════════════════════════════════════════════════════════════
-- Cypher Cache — Phase 3 migration (analytics)
-- Run in the Supabase SQL editor BEFORE deploying the Phase 3 code.
-- Safe to run more than once (idempotent).
-- ════════════════════════════════════════════════════════════════

create table if not exists track_events (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references tracks(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  event_type text not null check (event_type in ('play','download')),
  version_idx int,            -- which version, if applicable
  created_at timestamptz default now()
);

create index if not exists idx_track_events_track  on track_events(track_id);
create index if not exists idx_track_events_client on track_events(client_id);
create index if not exists idx_track_events_type   on track_events(event_type);
create index if not exists idx_track_events_created on track_events(created_at);

-- Small key/value store for admin preferences (e.g. the Insights default range).
create table if not exists app_settings (
  key text primary key,
  value text
);
-- Seed the Insights default range (admin can change it from the Insights tab).
insert into app_settings (key, value) values ('insights_default_range', '30d')
  on conflict (key) do nothing;

-- Notes:
-- • One row per play (fired once a track passes 4s of playback) and per download.
-- • client_id is captured from the logged-in client. on delete set null keeps a
--   track's totals intact if a client is later removed (events become anonymous).
-- • Totals are COUNT queries; no counters to keep in sync.
-- • Write-mostly and non-sensitive, so open RLS is acceptable here.
