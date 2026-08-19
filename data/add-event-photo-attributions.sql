-- Google-required photo attribution for event photos (we source a photo of the event's venue
-- from Google Places), aligned with the event's photo. Mirrors places.photo_attributions.
-- Safe to re-run.
alter table public.events add column if not exists photo_attributions text[];
