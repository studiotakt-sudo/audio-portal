-- ════════════════════════════════════════════════════════════════
-- Cypher Cache — Phase 7 (Supabase Auth + Row Level Security)
-- Run in the Supabase SQL editor. Safe to run more than once.
--
-- ⚠ CUTOVER MIGRATION — read README-PHASE7.md first.
--   The moment this runs, the OLD deployed frontend can no longer
--   log in (the clients table stops being anonymously readable).
--   Run the full sequence (SQL → edge function → user script →
--   deploy → cleanup) in one sitting.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Link clients to Supabase Auth users ───────────────────────
alter table clients add column if not exists user_id uuid unique references auth.users(id) on delete cascade;
create index if not exists idx_clients_user on clients(user_id);

-- ── 2. Private (admin-only) notes move to their own tables ───────
-- RLS is row-level, not column-level: as long as admin_notes lives on
-- tracks/clients, any client could read it on rows they can see.
create table if not exists track_private (
  track_id uuid primary key references tracks(id) on delete cascade,
  admin_notes text default '',
  project_file_ref text default ''
);

create table if not exists client_private (
  client_id uuid primary key references clients(id) on delete cascade,
  admin_notes text default ''
);

-- Copy existing notes across (only while the old columns still exist —
-- they are dropped later by phase7_cleanup.sql).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'tracks' and column_name = 'admin_notes') then
    execute $q$
      insert into track_private (track_id, admin_notes, project_file_ref)
      select id, coalesce(admin_notes, ''), coalesce(project_file_ref, '')
      from tracks
      where coalesce(admin_notes, '') <> '' or coalesce(project_file_ref, '') <> ''
      on conflict (track_id) do nothing
    $q$;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'clients' and column_name = 'admin_notes') then
    execute $q$
      insert into client_private (client_id, admin_notes)
      select id, coalesce(admin_notes, '')
      from clients
      where coalesce(admin_notes, '') <> ''
      on conflict (client_id) do nothing
    $q$;
  end if;
end $$;

-- ── 3. Helper functions used by the policies ─────────────────────
-- SECURITY DEFINER so they can read `clients` without tripping the
-- RLS policies on `clients` itself (avoids policy recursion).
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from clients
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_client_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from clients where user_id = auth.uid();
$$;

revoke execute on function public.is_admin() from anon;
revoke execute on function public.current_client_id() from anon;
grant  execute on function public.is_admin() to authenticated;
grant  execute on function public.current_client_id() to authenticated;

-- ── 4. Row Level Security — application tables ───────────────────

-- clients: you can read your OWN row; admins read everything.
-- All writes go through the service role (edge function) or an admin.
alter table clients enable row level security;
drop policy if exists clients_read   on clients;
drop policy if exists clients_insert on clients;
drop policy if exists clients_update on clients;
drop policy if exists clients_delete on clients;
create policy clients_read   on clients for select to authenticated using (user_id = auth.uid() or is_admin());
create policy clients_insert on clients for insert to authenticated with check (is_admin());
create policy clients_update on clients for update to authenticated using (is_admin()) with check (is_admin());
create policy clients_delete on clients for delete to authenticated using (is_admin());

-- tracks: clients see PUBLISHED tracks that are either unrestricted or
-- explicitly assigned to them. `current_client_id() is not null` also
-- blocks any stray auth user that has no clients row.
-- The assigned_to column's type isn't pinned down in earlier migrations,
-- so detect it and build the matching policy.
alter table tracks enable row level security;
do $$
declare v_type text;
begin
  select data_type into v_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'tracks' and column_name = 'assigned_to';

  execute 'drop policy if exists tracks_read on tracks';

  if v_type = 'jsonb' then
    execute $p$
      create policy tracks_read on tracks for select to authenticated using (
        is_admin() or (
          is_published = true
          and current_client_id() is not null
          and (
            assigned_to is null
            or jsonb_array_length(assigned_to) = 0
            or assigned_to @> to_jsonb(current_client_id()::text)
          )
        )
      )
    $p$;
  elsif v_type = 'ARRAY' then
    execute $p$
      create policy tracks_read on tracks for select to authenticated using (
        is_admin() or (
          is_published = true
          and current_client_id() is not null
          and (
            assigned_to is null
            or cardinality(assigned_to) = 0
            or current_client_id()::text = any (assigned_to::text[])
          )
        )
      )
    $p$;
  else
    raise exception 'Unexpected type for tracks.assigned_to: % — adjust the tracks_read policy by hand', coalesce(v_type, 'MISSING');
  end if;
end $$;

drop policy if exists tracks_insert on tracks;
drop policy if exists tracks_update on tracks;
drop policy if exists tracks_delete on tracks;
create policy tracks_insert on tracks for insert to authenticated with check (is_admin());
create policy tracks_update on tracks for update to authenticated using (is_admin()) with check (is_admin());
create policy tracks_delete on tracks for delete to authenticated using (is_admin());

-- track_events: clients may insert THEIR OWN events; only admins read.
alter table track_events enable row level security;
drop policy if exists track_events_insert on track_events;
drop policy if exists track_events_read   on track_events;
drop policy if exists track_events_delete on track_events;
create policy track_events_insert on track_events for insert to authenticated
  with check (is_admin() or client_id = current_client_id());
create policy track_events_read   on track_events for select to authenticated using (is_admin());
create policy track_events_delete on track_events for delete to authenticated using (is_admin());

-- composers: readable by any signed-in user (names show in the client UI);
-- writable by admins only.
alter table composers enable row level security;
drop policy if exists composers_read  on composers;
drop policy if exists composers_write on composers;
drop policy if exists composers_update on composers;
drop policy if exists composers_delete on composers;
create policy composers_read   on composers for select to authenticated using (true);
create policy composers_write  on composers for insert to authenticated with check (is_admin());
create policy composers_update on composers for update to authenticated using (is_admin()) with check (is_admin());
create policy composers_delete on composers for delete to authenticated using (is_admin());

-- app_settings: admin only (Insights preferences).
alter table app_settings enable row level security;
drop policy if exists app_settings_read  on app_settings;
drop policy if exists app_settings_write on app_settings;
drop policy if exists app_settings_update on app_settings;
create policy app_settings_read   on app_settings for select to authenticated using (is_admin());
create policy app_settings_write  on app_settings for insert to authenticated with check (is_admin());
create policy app_settings_update on app_settings for update to authenticated using (is_admin()) with check (is_admin());

-- theme: read by EVERYONE (the login page is themed before sign-in);
-- write by admins only.
alter table theme enable row level security;
drop policy if exists theme_read   on theme;
drop policy if exists theme_update on theme;
create policy theme_read   on theme for select to anon, authenticated using (true);
create policy theme_update on theme for update to authenticated using (is_admin()) with check (is_admin());

-- private notes tables: admin only, full stop.
alter table track_private  enable row level security;
alter table client_private enable row level security;
drop policy if exists track_private_all  on track_private;
drop policy if exists client_private_all on client_private;
create policy track_private_all  on track_private  for all to authenticated using (is_admin()) with check (is_admin());
create policy client_private_all on client_private for all to authenticated using (is_admin()) with check (is_admin());

-- ── 5. Storage policies ───────────────────────────────────────────
-- Drop any pre-existing permissive policies that mention our buckets,
-- then install: signed-URL reads for signed-in users, writes for admins.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%audio-tracks%' or coalesce(with_check, '') ilike '%audio-tracks%'
        or coalesce(qual, '') ilike '%featured-images%' or coalesce(with_check, '') ilike '%featured-images%')
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;

create policy cypher_audio_read   on storage.objects for select to authenticated using (bucket_id = 'audio-tracks');
create policy cypher_audio_insert on storage.objects for insert to authenticated with check (bucket_id = 'audio-tracks' and public.is_admin());
create policy cypher_audio_update on storage.objects for update to authenticated using (bucket_id = 'audio-tracks' and public.is_admin());
create policy cypher_audio_delete on storage.objects for delete to authenticated using (bucket_id = 'audio-tracks' and public.is_admin());

create policy cypher_img_read   on storage.objects for select to authenticated using (bucket_id = 'featured-images');
create policy cypher_img_insert on storage.objects for insert to authenticated with check (bucket_id = 'featured-images' and public.is_admin());
create policy cypher_img_update on storage.objects for update to authenticated using (bucket_id = 'featured-images' and public.is_admin());
create policy cypher_img_delete on storage.objects for delete to authenticated using (bucket_id = 'featured-images' and public.is_admin());

-- NOTE: reads are "any signed-in user" rather than per-track. File paths are
-- unguessable (timestamped) and unenumerable (tracks RLS hides the rows), so
-- this blocks the real threat — anonymous access — without a heavyweight
-- per-path JSONB policy. Tighten later if a client roster ever demands it.

-- ── 6. Analytics RPCs (fix the silent 1000-row cap) ──────────────
-- SECURITY INVOKER (the default): the track_events RLS applies inside,
-- so non-admins simply get zeros. Aggregation happens in Postgres and
-- only the summary crosses the wire — no row cap in play.
create or replace function public.insights_summary(p_since timestamptz default null)
returns jsonb
language sql stable
as $$
  with ev as (
    select track_id, client_id, event_type
    from track_events
    where p_since is null or created_at >= p_since
  )
  select jsonb_build_object(
    'plays',          (select count(*) from ev where event_type = 'play'),
    'downloads',      (select count(*) from ev where event_type = 'download'),
    'unique_clients', (select count(distinct client_id) from ev where client_id is not null),
    'top_played', (
      select coalesce(jsonb_agg(jsonb_build_object('id', track_id, 'count', n) order by n desc), '[]'::jsonb)
      from (select track_id, count(*) n from ev where event_type = 'play' group by track_id order by n desc limit 8) s
    ),
    'top_downloaded', (
      select coalesce(jsonb_agg(jsonb_build_object('id', track_id, 'count', n) order by n desc), '[]'::jsonb)
      from (select track_id, count(*) n from ev where event_type = 'download' group by track_id order by n desc limit 8) s
    ),
    'active_clients', (
      select coalesce(jsonb_agg(jsonb_build_object('id', client_id, 'count', n) order by n desc), '[]'::jsonb)
      from (select client_id, count(*) n from ev group by client_id order by n desc limit 8) s
    )
  );
$$;

create or replace function public.track_stats(p_track_id uuid)
returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'plays', (select count(*) from track_events where track_id = p_track_id and event_type = 'play'),
    'downloaders', (
      select coalesce(jsonb_agg(jsonb_build_object('client_id', client_id, 'count', n) order by n desc), '[]'::jsonb)
      from (
        select client_id, count(*) n
        from track_events
        where track_id = p_track_id and event_type = 'download'
        group by client_id
      ) s
    )
  );
$$;

revoke execute on function public.insights_summary(timestamptz) from anon;
revoke execute on function public.track_stats(uuid) from anon;
grant  execute on function public.insights_summary(timestamptz) to authenticated;
grant  execute on function public.track_stats(uuid) to authenticated;
