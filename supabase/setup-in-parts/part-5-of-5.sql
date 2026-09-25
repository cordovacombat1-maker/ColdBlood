-- COLD BLOOD database setup — PART 5 OF 5: Mind (last part)
-- Run parts 1 to 5 in order, each in its own SQL Editor query.
-- Part 4 must have succeeded before running this one.

-- ---------------------------------------------------------------------------
-- Mind
-- ---------------------------------------------------------------------------

-- The Master Key text itself ships with the app as Markdown (src/content/master-key),
-- so it works offline. This table tracks the fighter's progress through it.
create table public.mk_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  current_part int not null default 1 check (current_part between 1 and 24),
  part_started_at date not null default current_date,
  notes jsonb not null default '{}'::jsonb,  -- {"1": "notes for part 1", ...}
  checks jsonb not null default '{}'::jsonb  -- {"1": [true, false], ...} exercise checklist
);
select public.cb_own_table('mk_progress');

create table public.dream_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  "order" int not null default 0
);
select public.cb_own_table('dream_boards');

create table public.dream_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  board_id uuid references public.dream_boards (id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('photo', 'video')),
  caption text,
  goal_category text check (goal_category in ('belt', 'house', 'family', 'car', 'money', 'physique', 'other')),
  position_x numeric,
  position_y numeric,
  width numeric,
  height numeric,
  "order" int not null default 0
);
select public.cb_own_table('dream_items');

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  category text not null check (category in ('career', 'financial', 'physical', 'personal')),
  target_date date,
  status text not null default 'active' check (status in ('active', 'achieved', 'dropped')),
  why text,
  dream_item_id uuid references public.dream_items (id) on delete set null
);
select public.cb_own_table('goals');

create table public.affirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  text text not null,
  active boolean not null default true,
  "order" int not null default 0
);
select public.cb_own_table('affirmations');

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date date not null default current_date,
  gratitude text,
  intention text,
  reflection text,
  unique (user_id, date)
);
select public.cb_own_table('journal_entries');

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  steps jsonb not null default '[]'::jsonb,
  schedule jsonb
);
select public.cb_own_table('routines');

create table public.mind_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date date not null default current_date,
  type text not null check (type in ('meditation', 'visualization', 'MK exercise')),
  duration_min numeric(5,1),
  routine_id uuid references public.routines (id) on delete set null,
  mk_part int check (mk_part between 1 and 24)
);
select public.cb_own_table('mind_sessions');
create index mind_sessions_user_date_idx on public.mind_sessions (user_id, date);

drop function public.cb_own_table(text);
