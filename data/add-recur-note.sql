-- Short human-readable schedule for a recurring event, e.g. "Every Wednesday",
-- "1st Sunday of the month", "Daily", "Tuesdays and Thursdays". Captured from the source so we
-- can SHOW the visitor exactly when it happens (recur_days only covers weekly weekday patterns
-- and is used for filtering). English + Spanish. Safe to re-run.
alter table public.events add column if not exists recur_note text;
alter table public.events add column if not exists recur_note_es text;
