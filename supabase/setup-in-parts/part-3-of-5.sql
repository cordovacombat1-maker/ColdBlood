-- COLD BLOOD database setup — PART 3 OF 5: Weight, nutrition, career and contacts
-- Run parts 1 to 5 in order, each in its own SQL Editor query.
-- Part 2 must have succeeded before running this one.

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
