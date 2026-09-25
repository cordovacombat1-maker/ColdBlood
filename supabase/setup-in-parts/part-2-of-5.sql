-- COLD BLOOD database setup — PART 2 OF 5: Fights, schedule and training
-- Run parts 1 to 5 in order, each in its own SQL Editor query.
-- Part 1 must have succeeded before running this one.

-- ---------------------------------------------------------------------------
-- Fights, camps, schedule
-- ---------------------------------------------------------------------------

create table public.fights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date timestamptz not null,
  opponent text,
  venue text,
  city text,
  commission text,
  weigh_in_at timestamptz,
  contract_weight numeric(6,2), -- lb
  rounds int,
  purse numeric(12,2),
  status text not null default 'upcoming'
    check (status in ('upcoming', 'won', 'lost', 'draw', 'NC')),
  method text,
  round_ended int,
  notes text,
  checklist jsonb not null default '{}'::jsonb -- fight week checklist state
);
select public.cb_own_table('fights');
create index fights_user_date_idx on public.fights (user_id, date);

create table public.camps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fight_id uuid references public.fights (id) on delete cascade,
  start_date date not null,
  template int not null check (template in (8, 10, 12)),
  phase_notes jsonb not null default '{}'::jsonb
);
select public.cb_own_table('camps');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  type text not null default 'training'
    check (type in ('training', 'sparring', 'weigh-in', 'medical', 'media', 'travel', 'other')),
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  camp_id uuid references public.camps (id) on delete set null,
  reminder_min int,
  -- Recurrence, e.g. {"freq":"weekly","days":[2,4,6],"until":"2026-12-31"}
  -- or {"freq":"daily"}. Null = one-off event.
  repeat jsonb
);
select public.cb_own_table('events');
create index events_user_start_idx on public.events (user_id, start_at);

-- ---------------------------------------------------------------------------
-- Training
-- ---------------------------------------------------------------------------

create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date date not null default current_date,
  type text not null
    check (type in ('roadwork', 'bag', 'pads', 'mitts', 'sparring', 'S&C', 'technique', 'recovery')),
  duration_min int,
  rounds int,
  rpe_1_10 int check (rpe_1_10 between 1 and 10),
  notes text,
  video_url text
);
select public.cb_own_table('training_sessions');
create index training_sessions_user_date_idx on public.training_sessions (user_id, date);

create table public.sparring_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  session_id uuid not null references public.training_sessions (id) on delete cascade,
  partner text,
  rounds int,
  what_worked text,
  what_didnt text,
  damage_taken text check (damage_taken in ('none', 'light', 'moderate', 'heavy'))
);
select public.cb_own_table('sparring_rounds');

create table public.roadwork (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date date not null default current_date,
  distance numeric(6,2), -- miles
  duration interval,
  avg_pace interval,     -- per mile
  route_notes text
);
select public.cb_own_table('roadwork');

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  session_type text,
  steps jsonb not null default '[]'::jsonb
);
select public.cb_own_table('workout_templates');

create table public.wellness (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date date not null default current_date,
  sleep_hours numeric(4,1),
  resting_hr int,
  soreness_1_5 int check (soreness_1_5 between 1 and 5),
  energy_1_5 int check (energy_1_5 between 1 and 5),
  mood_1_5 int check (mood_1_5 between 1 and 5),
  unique (user_id, date)
);
select public.cb_own_table('wellness');

create table public.injuries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  area text not null,
  description text,
  date_start date,
  date_cleared date,
  status text not null default 'active' check (status in ('active', 'managing', 'cleared')),
  provider text
);
select public.cb_own_table('injuries');
