-- COLD BLOOD database setup — PART 1 OF 5: Helpers and profile
-- Run parts 1 to 5 in order, each in its own SQL Editor query.

-- COLD BLOOD — initial schema.
-- Every user-owned table: id, user_id, created_at, updated_at, and RLS limiting
-- access to rows where user_id = auth.uid(). Global content tables (curated
-- videos, lessons) are readable by everyone signed in and writable by admins.
--
-- Weights are stored in POUNDS (numeric). The app converts to kg for display
-- when profiles.units = 'kg'. Distances are stored in miles.


-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
-- No policies: only the service role / SQL editor can manage admins.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- Creates the standard columns' trigger + owner-only RLS policies for a table.
create or replace function public.cb_own_table(t text)
returns void language plpgsql as $$
begin
  execute format('alter table public.%I enable row level security', t);
  execute format(
    'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
    t || '_updated_at', t);
  execute format(
    'create policy "own rows: select" on public.%I for select using (user_id = auth.uid())', t);
  execute format(
    'create policy "own rows: insert" on public.%I for insert with check (user_id = auth.uid())', t);
  execute format(
    'create policy "own rows: update" on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  execute format(
    'create policy "own rows: delete" on public.%I for delete using (user_id = auth.uid())', t);
  execute format('create index %I on public.%I (user_id)', t || '_user_id_idx', t);
end $$;

-- ---------------------------------------------------------------------------
-- Profile
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fighter_name text,
  nickname text,
  weight_class text,
  stance text check (stance in ('orthodox', 'southpaw', 'switch')),
  height_cm numeric(5,1),
  reach_cm numeric(5,1),
  gym text,
  record_w int not null default 0,
  record_l int not null default 0,
  record_d int not null default 0,
  record_ko int not null default 0,
  units text not null default 'lb' check (units in ('lb', 'kg')),
  walk_around_target numeric(6,2) -- lb; used when no fight is booked
);
select public.cb_own_table('profiles');

-- Auto-create a profile when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
