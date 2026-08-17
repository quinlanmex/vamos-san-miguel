-- Community walking paths: a named, ordered set of map points forming a walking circuit.
-- Points is a JSON array of { lat, lng, label, note }. Anyone can submit one; reads are
-- public for published paths. Writes go through the server (service role), which bypasses
-- RLS, so no insert policy is needed for anon.
create extension if not exists "pgcrypto";

create table if not exists public.walking_paths (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  author text,
  summary text,
  points jsonb not null default '[]'::jsonb,
  status text not null default 'published',
  created_at timestamptz not null default now()
);

alter table public.walking_paths enable row level security;

drop policy if exists "read published walks" on public.walking_paths;
create policy "read published walks" on public.walking_paths
  for select using (status = 'published');
