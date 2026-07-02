-- ════════════════════════════════════════════════════════════════
-- Cypher Cache — Phase 6 (batch upload + draft state)
-- Run in the Supabase SQL editor BEFORE deploying the Phase 6 code.
-- Safe to run more than once (idempotent).
-- ════════════════════════════════════════════════════════════════

-- Draft/published flag. Existing tracks default to true (stay visible).
-- Batch-uploaded tracks are created with is_published = false (hidden drafts)
-- until you publish them from the review view.
alter table tracks add column if not exists is_published boolean default true;
create index if not exists idx_tracks_published on tracks(is_published);

-- Safety: make sure all EXISTING tracks are explicitly published, so nothing
-- already live accidentally reads as a draft (null) after the column is added.
update tracks set is_published = true where is_published is null;
