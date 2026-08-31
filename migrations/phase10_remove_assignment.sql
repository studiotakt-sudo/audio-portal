-- ════════════════════════════════════════════════════════════════
-- Cypher Cache — Phase 10 (remove per-client track assignment)
-- Run in the Supabase SQL editor AFTER phases 7, 8, 9. Idempotent.
--
-- Removes per-client assignment. Every PUBLISHED track becomes visible to every
-- approved client. Drafts (is_published = false) stay hidden. Order matters:
-- the RLS policy that references assigned_to is rewritten FIRST, then the
-- column is dropped — otherwise the policy would break.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Rewrite tracks_read to not depend on assigned_to ──────────
-- A client now sees any published track (as long as they're an approved client,
-- which current_client_id() already enforces via phase 8). Admins see all.
drop policy if exists tracks_read on tracks;
create policy tracks_read on tracks for select to authenticated using (
  is_admin() or (
    is_published = true
    and current_client_id() is not null
  )
);

-- ── 2. Now it's safe to drop the column ──────────────────────────
alter table tracks drop column if exists assigned_to;
