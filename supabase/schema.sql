create extension if not exists pgcrypto;

create table if not exists public.workability_submissions (
  id uuid primary key default gen_random_uuid(),
  cafe_key text not null,
  cafe_name text not null,
  google_place_id text,
  neighborhood text not null,
  borough text not null check (borough in ('Manhattan', 'Brooklyn')),
  outlets text not null check (outlets in ('Plenty', 'Some', 'Scarce', 'None')),
  seating text not null check (seating in ('Tables', 'Communal', 'Counter', 'Sofas', 'Cubbies')),
  noise text not null check (noise in ('Quiet', 'Moderate', 'Loud')),
  calls text not null check (calls in ('Okay', 'Short calls only', 'Not appropriate')),
  notes text check (char_length(notes) <= 500),
  contributor_id uuid not null,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists workability_submissions_cafe_key_idx
  on public.workability_submissions (cafe_key);

create index if not exists workability_submissions_moderation_idx
  on public.workability_submissions (moderation_status, created_at desc);

alter table public.workability_submissions enable row level security;

drop policy if exists "Anyone can submit a workability rating"
  on public.workability_submissions;

create policy "Anyone can submit a workability rating"
  on public.workability_submissions
  for insert
  to anon, authenticated
  with check (moderation_status = 'pending');

drop policy if exists "Approved ratings are public"
  on public.workability_submissions;

create policy "Approved ratings are public"
  on public.workability_submissions
  for select
  to anon, authenticated
  using (moderation_status = 'approved');

create table if not exists public.workability_analyses (
  google_place_id text primary key,
  cafe_name text not null,
  analysis jsonb not null,
  source_rating_count integer,
  analyzed_at timestamptz not null default now()
);

alter table public.workability_analyses enable row level security;

drop policy if exists "AI analyses are publicly readable"
  on public.workability_analyses;

create policy "AI analyses are publicly readable"
  on public.workability_analyses
  for select
  to anon, authenticated
  using (true);
