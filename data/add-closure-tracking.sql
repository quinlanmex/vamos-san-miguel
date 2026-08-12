-- Vamos San Miguel: track permanently-closed picks via Google, separate from editorial status.
-- Run once in the Supabase SQL Editor. Safe to run more than once.

-- OPERATIONAL / CLOSED_PERMANENTLY / CLOSED_TEMPORARILY (mirrors Google Places business_status)
alter table places add column if not exists business_status   text;
-- When we first detected a permanent closure (cleared automatically if it reopens)
alter table places add column if not exists closed_at         timestamptz;
-- Last time we checked this place against Google
alter table places add column if not exists status_checked_at timestamptz;
