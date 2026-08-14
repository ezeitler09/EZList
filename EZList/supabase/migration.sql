-- CartShare — Milestone 1 schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
-- Prerequisite: enable Anonymous sign-ins (Dashboard → Authentication → Sign In / Up → Anonymous).

-- ---------- Tables ----------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Groceries',
  code text not null unique,
  section_order jsonb not null default '["Produce","Meat & Seafood","Dairy & Eggs","Bakery","Frozen","Pantry & Dry Goods","Canned Goods","Beverages","Snacks","Condiments & Spices","Household & Cleaning","Personal Care","Other"]',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  display_name text not null,
  color text not null default '#16a34a',
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  qty text,
  category text not null default 'Other',
  checked boolean not null default false,
  checked_at timestamptz,
  added_by uuid references public.profiles (id) on delete set null,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
create index items_household_idx on public.items (household_id);

create table public.category_overrides (
  household_id uuid not null references public.households (id) on delete cascade,
  item_key text not null,
  category text not null,
  primary key (household_id, item_key)
);

-- ---------- Helper ----------

create or replace function public.my_household_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

-- ---------- Row Level Security ----------

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.category_overrides enable row level security;

create policy "members read household" on public.households
  for select using (id = public.my_household_id());
create policy "members update household" on public.households
  for update using (id = public.my_household_id());

create policy "members read profiles" on public.profiles
  for select using (household_id = public.my_household_id());
create policy "user updates own profile" on public.profiles
  for update using (id = auth.uid());

create policy "members full access to items" on public.items
  for all using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());

create policy "members full access to overrides" on public.category_overrides
  for all using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());

-- ---------- RPCs (security definer: safely handle the join/create chicken-and-egg) ----------

create or replace function public.create_household(hname text, dname text, dcolor text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
  h public.households;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'already in a household';
  end if;
  -- 6-char human-friendly code, no ambiguous chars
  loop
    new_code := (
      select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random()*31))::int + 1, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from public.households where code = new_code);
  end loop;
  insert into public.households (name, code) values (coalesce(nullif(hname,''),'Our Groceries'), new_code) returning * into h;
  insert into public.profiles (id, household_id, display_name, color) values (auth.uid(), h.id, dname, dcolor);
  return json_build_object('id', h.id, 'name', h.name, 'code', h.code);
end;
$$;

create or replace function public.join_household(jcode text, dname text, dcolor text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.households;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into h from public.households where code = upper(trim(jcode));
  if h.id is null then raise exception 'invalid code'; end if;
  insert into public.profiles (id, household_id, display_name, color)
  values (auth.uid(), h.id, dname, dcolor)
  on conflict (id) do nothing;
  return json_build_object('id', h.id, 'name', h.name, 'code', h.code);
end;
$$;

-- ---------- Realtime ----------

alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.households;
