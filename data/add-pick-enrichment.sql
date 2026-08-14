-- Practical facts pulled from Google Places for each pick (hours + attributes).
-- No ratings/reviews are stored. Filled by /api/enrich-picks; refreshed weekly.
-- Run once in the Supabase SQL editor.
alter table public.places add column if not exists hours_json  jsonb;       -- { weekday_text: [], periods: [] }
alter table public.places add column if not exists place_attrs jsonb;       -- { reservable, vegetarian, wheelchair, beer, wine, takeout, delivery, dine_in }
alter table public.places add column if not exists enriched_at timestamptz; -- last Places refresh
