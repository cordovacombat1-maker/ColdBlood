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

-- ---------------------------------------------------------------------------
-- Weight and nutrition
-- ---------------------------------------------------------------------------

create table public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  taken_at timestamptz not null default now(),
  weight numeric(6,2) not null, -- lb
  time_of_day text check (time_of_day in ('morning', 'midday', 'evening', 'post-training', 'official')),
  notes text
);
select public.cb_own_table('weigh_ins');
create index weigh_ins_user_taken_idx on public.weigh_ins (user_id, taken_at);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  eaten_at timestamptz not null default now(),
  name text not null,
  calories int,
  protein_g numeric(6,1),
  carbs_g numeric(6,1),
  fat_g numeric(6,1),
  photo_url text
);
select public.cb_own_table('meals');

create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  calories int,
  protein_g numeric(6,1),
  carbs_g numeric(6,1),
  fat_g numeric(6,1)
);
select public.cb_own_table('saved_meals');

create table public.water (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date date not null default current_date,
  amount numeric(6,1) not null -- fl oz
);
select public.cb_own_table('water');

create table public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  calories int,
  protein_g numeric(6,1),
  carbs_g numeric(6,1),
  fat_g numeric(6,1),
  water_target numeric(6,1) -- fl oz
);
select public.cb_own_table('nutrition_targets');

-- ---------------------------------------------------------------------------
-- Career and business
-- ---------------------------------------------------------------------------

create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  type text not null
    check (type in ('commission license', 'physical', 'bloodwork', 'eye exam', 'MRI', 'other')),
  issuer text,
  issued date,
  expires date,
  file_url text
);
select public.cb_own_table('licenses');

create table public.finances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date date not null default current_date,
  kind text not null check (kind in ('income', 'expense')),
  category text not null
    check (category in ('purse', 'sponsor', 'gym', 'travel', 'medical', 'gear', 'coach', 'other')),
  amount numeric(12,2) not null,
  fight_id uuid references public.fights (id) on delete set null,
  notes text
);
select public.cb_own_table('finances');

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  role text not null default 'other'
    check (role in ('trainer', 'manager', 'promoter', 'cutman', 'matchmaker', 'commission',
                    'sparring', 'physio', 'nutritionist', 'media', 'other')),
  phone text,
  email text,
  company text,
  city text,
  notes text,
  favorite boolean not null default false
);
select public.cb_own_table('contacts');

-- Which contacts worked a given fight (promoter, matchmaker, cutman...).
create table public.fight_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fight_id uuid not null references public.fights (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  role text,
  unique (fight_id, contact_id)
);
select public.cb_own_table('fight_contacts');

-- ---------------------------------------------------------------------------
-- Learning (global content + per-user progress)
-- ---------------------------------------------------------------------------

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  -- null for curated (global) videos; set for the fighter's own footage/saves.
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  url text not null,
  source text,
  skill_tag text,
  level text check (level in ('fundamental', 'intermediate', 'advanced')),
  is_curated boolean not null default false,
  user_saved boolean not null default false,
  check (is_curated or user_id is not null)
);
alter table public.videos enable row level security;
create trigger videos_updated_at before update on public.videos
  for each row execute function public.set_updated_at();
create index videos_user_id_idx on public.videos (user_id);
create policy "videos: read curated or own" on public.videos for select
  using (is_curated or user_id = auth.uid());
create policy "videos: insert own or admin" on public.videos for insert
  with check ((not is_curated and user_id = auth.uid()) or public.is_admin());
create policy "videos: update own or admin" on public.videos for update
  using ((not is_curated and user_id = auth.uid()) or public.is_admin())
  with check ((not is_curated and user_id = auth.uid()) or public.is_admin());
create policy "videos: delete own or admin" on public.videos for delete
  using ((not is_curated and user_id = auth.uid()) or public.is_admin());

-- Per-user saved / watched / notes on any video (curated or own).
create table public.video_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  video_id uuid not null references public.videos (id) on delete cascade,
  saved boolean not null default false,
  watched boolean not null default false,
  notes text,
  unique (user_id, video_id)
);
select public.cb_own_table('video_progress');

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  category text not null,
  body_md text not null default '',
  "order" int not null default 0
);
alter table public.lessons enable row level security;
create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();
create policy "lessons: read all signed in" on public.lessons for select
  using (auth.uid() is not null);
create policy "lessons: admin insert" on public.lessons for insert with check (public.is_admin());
create policy "lessons: admin update" on public.lessons for update
  using (public.is_admin()) with check (public.is_admin());
create policy "lessons: admin delete" on public.lessons for delete using (public.is_admin());

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
