-- "Best of" categories that drive the home rails. Each is an intent people arrive with
-- (best rooftop, best tacos al pastor, best local breakfast...). You crown the winner via
-- the admin wizard; runners-up are the "and 2 more". Public read of published rows.
create extension if not exists "pgcrypto";

create table if not exists public.best_of_categories (
  slug text primary key,                 -- e.g. 'best_rooftop'
  label_en text not null,                -- 'Best rooftop for sunset drinks'
  label_es text,
  blurb_en text,                         -- one line of context, optional
  blurb_es text,
  winner_place_id uuid references public.places(id) on delete set null,
  runner_up_ids uuid[] default '{}',     -- the "and 2 more"
  sort int not null default 100,         -- ordering on the home
  status text not null default 'published',
  updated_at timestamptz not null default now()
);

alter table public.best_of_categories enable row level security;
drop policy if exists "read published best_of" on public.best_of_categories;
create policy "read published best_of" on public.best_of_categories
  for select using (status = 'published');

-- Starter set of intent-led categories (edit/extend in the admin wizard). Winners are set
-- there. Safe to re-run: existing rows are left untouched.
insert into public.best_of_categories (slug, label_en, label_es, sort) values
  ('best_rooftop',        'Best rooftop for sunset drinks',   'Mejor rooftop para el atardecer',      10),
  ('best_local_breakfast','Best local breakfast',             'Mejor desayuno local',                 20),
  ('best_tacos',          'Best tacos',                       'Mejores tacos',                        30),
  ('best_romantic_dinner','Best romantic dinner',             'Mejor cena romantica',                 40),
  ('best_coffee',         'Best coffee',                      'Mejor cafe',                           50),
  ('best_gallery_afternoon','Best gallery afternoon',         'Mejor tarde de galerias',              60),
  ('best_day_trip',       'Best day trip',                    'Mejor excursion de un dia',            70),
  ('best_market',         'Best market',                      'Mejor mercado',                        80)
on conflict (slug) do nothing;
