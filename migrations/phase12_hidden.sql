-- ════════════════════════════════════════════════════════════════
-- Cypher Cache — Phase 12 (hide individual tracks from clients)
-- Run in the Supabase SQL editor. Idempotent.
--
-- `hidden` is separate from `is_published`:
--   is_published = false  → a DRAFT (never released; lives in the drafts section)
--   hidden = true         → a released track temporarily pulled from client view
--                           (e.g. being pitched exclusively). Stays in the admin
--                           library with a "Hidden" badge.
-- ════════════════════════════════════════════════════════════════

alter table tracks add column if not exists hidden boolean not null default false;

-- Update the client-facing read policy so hidden tracks are excluded at the
-- database level (not just in the app). Admins still see everything.
drop policy if exists tracks_read on tracks;
create policy tracks_read on tracks for select to authenticated using (
  is_admin() or (
    is_published = true
    and hidden = false
    and current_client_id() is not null
  )
);
