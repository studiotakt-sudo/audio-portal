-- ════════════════════════════════════════════════════════════════
-- Cypher Cache — Phase 1 migration
-- Run this in the Supabase SQL editor BEFORE deploying the Phase 1 code.
-- Safe to run more than once (idempotent).
-- ════════════════════════════════════════════════════════════════

-- Feature 1: client emails (column already exists; index + enforce uniqueness
-- so it can be used as the login identifier).
create index if not exists idx_clients_email on clients(email);
create unique index if not exists idx_clients_email_unique on clients(lower(email));

-- Feature 2: private admin notes on clients (company, preferences, etc.)
alter table clients add column if not exists admin_notes text default '';

-- Feature 3: per-track admin notes + plain-text pointer to the source project.
alter table tracks add column if not exists admin_notes text default '';
alter table tracks add column if not exists project_file_ref text default '';

-- NOTE on existing clients: the unique index requires every client to have a
-- DISTINCT, non-null email before they can log in. Existing clients created
-- under the old name-based system will have NULL email. Two NULLs do not
-- collide under a unique index, so the index will apply cleanly, but those
-- clients cannot log in until you set an email for each via the admin panel.
