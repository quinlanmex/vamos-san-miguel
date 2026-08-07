-- ============================================================================
-- Vamos San Miguel — Supabase schema (Phase 1)
-- Paste into the Supabase SQL editor (Postgres 15+). Safe to re-run.
--
-- Design notes:
--  * Bilingual content is stored in explicit *_en / *_es columns so the AI
--    normalizer can fill each language and the front end can pick one.
--  * "Source-first" attribution: origin_name/origin_url is the REAL source
--    (venue/organizer) shown in the UI. discovered_via is the aggregator we
--    found it through — stored for the pipeline, NEVER shown to users.
--  * category / audience / diet mirror the prototype's filters and are the
--    inputs the future itinerary AI will plan against.
--  * status gates the admin paste → review → publish workflow.
-- ============================================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---- shared updated_at trigger --------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ---- categories (bilingual lookup; mirrors the app's CATS) -----------------
create table if not exists categories (
  slug        text primary key,          -- 'musica','cine','tours',...
  label_en    text not null,
  label_es    text not null,
  color       text not null,             -- hex, e.g. '#E11D74'
  sort_order  int  not null default 0
);

insert into categories (slug, label_en, label_es, color, sort_order) values
  ('musica',    'Music',     'Música',    '#E11D74', 1),
  ('cine',      'Film',      'Cine',      '#15539A', 2),
  ('tours',     'Tours',     'Tours',     '#2F7A63', 3),
  ('comunidad', 'Community', 'Comunidad', '#F2A100', 4),
  ('charlas',   'Talks',     'Charlas',   '#7A4F9E', 5),
  ('mercados',  'Markets',   'Mercados',  '#C6552E', 6),
  ('bienestar', 'Wellness',  'Bienestar', '#0E8C8C', 7)
on conflict (slug) do nothing;

-- ---- events ---------------------------------------------------------------
create table if not exists events (
  id             uuid primary key default gen_random_uuid(),
  status         text not null default 'draft'
                   check (status in ('draft','published','archived')),

  title_en       text not null,
  title_es       text not null,
  blurb_en       text,
  blurb_es       text,
  price_en       text,                    -- e.g. 'Free', '$330 MXN'
  price_es       text,                    -- e.g. 'Gratis'

  category       text not null references categories(slug),
  audience       text[] not null default '{}',   -- {'family','teens'}

  start_date     date not null,
  end_date       date not null,
  start_time     time,                     -- null = all-day / "varies"
  recurring      boolean not null default false,
  recurrence_rule text,                    -- iCal RRULE, optional

  venue          text,
  area           text,                     -- 'Centro','Norte',...
  lat            double precision,
  lng            double precision,

  origin_name    text,                     -- shown in UI ("Source: La Biblioteca")
  origin_url     text,
  discovered_via text,                      -- aggregator; INTERNAL, never shown
  source_ref     text,                      -- stable id/url for idempotent upserts

  photo_url      text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists events_start_idx    on events (start_date);
create index if not exists events_status_idx    on events (status);
create index if not exists events_category_idx  on events (category);
create index if not exists events_audience_idx  on events using gin (audience);
create unique index if not exists events_source_ref_idx
  on events (source_ref) where source_ref is not null;

drop trigger if exists events_set_updated_at on events;
create trigger events_set_updated_at before update on events
  for each row execute function set_updated_at();

-- Cross-source de-dup (same event on discoversma + Biblioteca) is handled in
-- the normalizer by matching title+start_date+venue; source_ref keeps each
-- source's own rows idempotent on re-crawl.

-- ---- places (Local Picks + directory) -------------------------------------
create table if not exists places (
  id             uuid primary key default gen_random_uuid(),
  status         text not null default 'draft'
                   check (status in ('draft','published','archived')),
  editorial      boolean not null default false,  -- true = your curated Local Pick
  list_key       text,                     -- groups picks: 'rest','bar','live'

  name           text not null,            -- proper names usually not translated
  desc_en        text,
  desc_es        text,

  category       text references categories(slug),
  audience       text[] not null default '{}',
  diet           text[] not null default '{}',    -- {'vegetarian','vegan'}

  area           text,
  lat            double precision,
  lng            double precision,

  origin_name    text,
  origin_url     text,
  google_place_id text,                     -- for Places API enrichment/refresh
  source_ref     text,

  photo_url      text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists places_status_idx    on places (status);
create index if not exists places_editorial_idx on places (editorial);
create index if not exists places_category_idx  on places (category);
create index if not exists places_audience_idx  on places using gin (audience);
create index if not exists places_diet_idx      on places using gin (diet);
create unique index if not exists places_source_ref_idx
  on places (source_ref) where source_ref is not null;

drop trigger if exists places_set_updated_at on places;
create trigger places_set_updated_at before update on places
  for each row execute function set_updated_at();

-- ---- user_saves (FUTURE: optional cross-device sync) ----------------------
-- Phase 1 keeps personal saves in the browser (localStorage, no login).
-- This table is only needed if/when you add optional accounts to sync saves.
create table if not exists user_saves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,                    -- Supabase Auth user, when accounts exist
  device_id   text,                    -- anonymous localStorage key fallback
  item_type   text not null check (item_type in ('event','place')),
  item_id     uuid not null,
  created_at  timestamptz not null default now()
);
create unique index if not exists user_saves_uniq
  on user_saves (coalesce(user_id::text, device_id), item_type, item_id);

-- ============================================================================
-- Row Level Security
--  * Public (anon) can READ only published content.
--  * Authenticated users (you, via Supabase Auth) can manage everything.
--    Tighten "authenticated" to an admin role once you add contributors.
-- ============================================================================
alter table categories enable row level security;
alter table events     enable row level security;
alter table places     enable row level security;
alter table user_saves enable row level security;

drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories
  for select using (true);
drop policy if exists "auth manage categories" on categories;
create policy "auth manage categories" on categories
  for all to authenticated using (true) with check (true);

drop policy if exists "public read published events" on events;
create policy "public read published events" on events
  for select using (status = 'published');
drop policy if exists "auth manage events" on events;
create policy "auth manage events" on events
  for all to authenticated using (true) with check (true);

drop policy if exists "public read published places" on places;
create policy "public read published places" on places
  for select using (status = 'published');
drop policy if exists "auth manage places" on places;
create policy "auth manage places" on places
  for all to authenticated using (true) with check (true);

drop policy if exists "auth manage saves" on user_saves;
create policy "auth manage saves" on user_saves
  for all to authenticated using (true) with check (true);
-- (Device-based anonymous save policies are added with the accounts phase.)
