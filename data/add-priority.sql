-- Importance ranking for the trip planner. 1 = essential/iconic (always include, e.g.
-- El Jardin / Parroquia), 2 = highly recommended, 3 = optional/filler. NULL is treated
-- as 3. Editable in admin. The planner combines this with trip length, party, and an
-- out-of-town flag (computed from coordinates) to decide what makes the cut.
alter table public.places add column if not exists priority smallint;
