-- EZList — Milestone 3a: saved recipes
-- Run this once in the Supabase SQL Editor (same place you ran migration.sql).
-- Safe to run on your live project — it only ADDS a table; nothing existing is touched.

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  source_url text,
  ingredients jsonb not null default '[]',  -- [{ "name": "...", "qty": "..." | null }]
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index recipes_household_idx on public.recipes (household_id);

alter table public.recipes enable row level security;

create policy "members full access to recipes" on public.recipes
  for all using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());
