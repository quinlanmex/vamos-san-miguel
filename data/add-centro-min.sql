-- Real driving time (minutes) from Centro for out-of-town picks, filled by
-- /api/drive-times using Google Distance Matrix. In-town picks show their colonia
-- and ignore this. Run once in the Supabase SQL editor.
alter table public.places add column if not exists centro_min integer;
