-- Vamos San Miguel: fields for the clickable Local Pick detail view.
-- Run once in the Supabase SQL Editor. Safe to run more than once.

alter table places add column if not exists photos      text[] default '{}';  -- extra gallery photos
alter table places add column if not exists phone       text;                 -- display phone
alter table places add column if not exists hours       text;                 -- e.g. "Tue-Sun 1-10pm"
alter table places add column if not exists price_level int;                  -- 1-4  -> $ to $$$$
alter table places add column if not exists tip         text;                 -- "good to know" line
alter table places add column if not exists featured    boolean default false; -- eligible for the rotating hero

-- Website already exists as origin_url. The card thumbnail is photo_url; the
-- gallery (photos) holds any additional images shown in the detail sheet.
