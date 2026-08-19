-- Stores the Google-required photo attribution (html_attributions) for each pick photo,
-- aligned by index with the existing photos[] array. Shown subtly under the photo so we
-- comply with the Places Photo API terms. Safe to run more than once.
alter table public.places add column if not exists photo_attributions text[];
