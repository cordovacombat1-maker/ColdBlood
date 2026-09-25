-- COLD BLOOD database setup — PART 4 OF 5: Videos and lessons
-- Run parts 1 to 5 in order, each in its own SQL Editor query.
-- Part 3 must have succeeded before running this one.

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
