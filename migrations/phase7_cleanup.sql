-- ════════════════════════════════════════════════════════════════
-- Cypher Cache — Phase 7 CLEANUP
-- Run ONLY after:
--   1. migrations/phase7.sql has been run,
--   2. scripts/migrate-users.mjs has created auth accounts for everyone,
--   3. the new frontend is deployed and you have logged in successfully.
--
-- Drops the legacy home-rolled password hashes and the notes columns
-- that moved into track_private / client_private. Irreversible —
-- but everything here is either dead weight or already copied.
-- Safe to run more than once.
-- ════════════════════════════════════════════════════════════════

alter table clients drop column if exists password_hash;
alter table clients drop column if exists admin_notes;

alter table tracks drop column if exists admin_notes;
alter table tracks drop column if exists project_file_ref;
