-- Articles table: server-rendered guide content, editable via Google Docs sync.
-- Run once in the Supabase SQL editor. Safe to re-run (IF NOT EXISTS).
--
-- Flow: markdown files seed this table (POST /api/seed-articles), then a
-- Google Doc is mapped to each row via google_doc_id, and /api/sync-docs
-- pulls the Doc content into body_md on a daily cron (or on-demand).

create table if not exists public.articles (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null default 'plan',   -- 'plan' | 'move'
  slug          text not null,
  title         text,
  description   text,
  body_md       text,                            -- markdown rendered on the page
  google_doc_id text,                            -- Google Doc this row syncs from
  synced_at     timestamptz,                     -- last successful Docs pull
  sort          int  not null default 100,
  updated_at    timestamptz not null default now(),
  unique (kind, slug)
);

-- Keep updated_at fresh on every write.
create or replace function public.touch_articles_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_articles_touch on public.articles;
create trigger trg_articles_touch before update on public.articles
  for each row execute function public.touch_articles_updated_at();

-- The site reads articles server-side with the service-role key, so RLS can stay
-- restrictive. Enable RLS and add no public policy: anon/browser can't read it,
-- only the service role (used by our server routes) can.
alter table public.articles enable row level security;
