-- Local-knowledge fields that make Vamos AI sound like a real local, not a guidebook.
-- All are additive and safe to run more than once. AI drafts them; your edits are locked.
--
--   local_take / local_take_es : the curator's opinionated, been-there take (the biggest
--                                lever for "real local knowledge"). Shown publicly.
--   caveat_internal            : the honest "what to skip" truth. INTERNAL ONLY - fed to the
--                                AI to steer people well, never shown on the public site.
--   vibe                       : 2-3 precise vibe words (romantic, buzzy, quiet, work-friendly)
--   occasion                   : who/what it's for (date, celebration, solo, kids, work)
--   best_of                    : superlative category slugs this place wins or contends for
--                                (e.g. {best_rooftop, best_tacos_al_pastor}). Powers the
--                                home best-of rails and gives the AI an authoritative signal.
--   pairs_with                 : names of spots that sequence well nearby (for weaving days)
--   last_verified              : when we last confirmed it's accurate/open (freshness)
alter table public.places add column if not exists local_take text;
alter table public.places add column if not exists local_take_es text;
alter table public.places add column if not exists caveat_internal text;
alter table public.places add column if not exists vibe text[] default '{}';
alter table public.places add column if not exists occasion text[] default '{}';
alter table public.places add column if not exists best_of text[] default '{}';
alter table public.places add column if not exists pairs_with text[] default '{}';
alter table public.places add column if not exists last_verified date;
