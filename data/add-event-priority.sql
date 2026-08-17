-- Trip-planner priority for events (1 = essential, 2 = recommended, 3 = optional).
-- Mirrors places.priority. Safe to run more than once.
alter table public.events add column if not exists priority int;
