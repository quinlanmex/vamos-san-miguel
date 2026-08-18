-- Review queue for photos scanned from a local Dropbox folder. The scan script only ever
-- uploads images that a vision pass judged to be San Miguel de Allende AND to contain no
-- recognizable people; those land here as "pending" for you to approve before use.
--
-- Also create a PUBLIC Storage bucket named "photos" in Supabase (Storage > New bucket >
-- name: photos, Public: on). The scan script uploads approved-by-AI images to
-- photos/candidates/... and stores the public URL here.
create extension if not exists "pgcrypto";

create table if not exists public.photo_candidates (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  storage_path text,
  caption text,
  tags text[] default '{}',
  source_file text,
  status text not null default 'pending', -- pending | approved | rejected
  created_at timestamptz not null default now()
);

alter table public.photo_candidates enable row level security;
drop policy if exists "read approved photos" on public.photo_candidates;
create policy "read approved photos" on public.photo_candidates
  for select using (status = 'approved');
