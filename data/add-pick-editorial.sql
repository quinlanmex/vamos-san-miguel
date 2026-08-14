-- Editorial fields for Local Picks — your personal, hand-picked voice. These are
-- always manual; no automated job ever writes or overwrites them. Run once in Supabase.
alter table public.places add column if not exists why_love      text;  -- "Why we love it"
alter table public.places add column if not exists what_to_order  text;  -- "What to order" (or "Don't miss")
alter table public.places add column if not exists best_time      text;  -- "Best time to go"
