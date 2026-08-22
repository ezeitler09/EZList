-- EZList — Milestone 4: pantry tracking
-- Run once in the Supabase SQL Editor (new query tab, paste, Run).
-- Additive only: creates the pantry table and one household setting; nothing existing is touched.

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  name_key text not null,          -- normalized + singularized for matching ("Eggs" → "egg")
  qty integer not null default 1 check (qty >= 0),
  category text not null default 'Other',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (household_id, name_key)
);
create index pantry_household_idx on public.pantry_items (household_id);

alter table public.pantry_items enable row level security;

create policy "members full access to pantry" on public.pantry_items
  for all using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());

-- Auto-stock: checking an item off at the store adds it to the pantry (toggleable in Settings)
alter table public.households add column auto_stock boolean not null default true;

alter publication supabase_realtime add table public.pantry_items;
