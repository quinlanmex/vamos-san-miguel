-- Spanish counterparts so every editorial field is bilingual (EN/ES), matching
-- desc_en/desc_es. Run once in Supabase. AI drafts both languages; your edits win.
alter table public.places add column if not exists tip_es           text;  -- "Good to know" (ES)
alter table public.places add column if not exists why_love_es      text;  -- "Why we love it" (ES)
alter table public.places add column if not exists what_to_order_es text;  -- "What to order" (ES)
alter table public.places add column if not exists best_time_es     text;  -- "Best time to go" (ES)
