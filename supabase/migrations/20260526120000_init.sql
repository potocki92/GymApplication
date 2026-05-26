-- FitFlow initial schema.
--
-- Tables: profiles (1-1 with auth.users), exercise_history, body_metrics,
-- body_metric_goals. Row-Level Security keyed off auth.uid() so a user can only
-- ever see/modify their own rows. A trigger seeds a profile row on signup.
--
-- The exercise catalog stays in client code (`data/exercises.ts`) for now — it's
-- a static, ~20-row reference dataset and migration to a DB table is deferred.

-- ─── Profiles ──────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id);

-- Trigger: seed profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Exercise history (one row per completed set) ──────────────────────────

create table if not exists public.exercise_history (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  workout_id text not null,
  session_id text not null,
  set_number int not null,
  reps int not null,
  weight_kg numeric(7,2) not null,
  one_rm_kg numeric(7,2) not null,
  completed_at timestamptz not null,
  rpe int,
  notes text
);

create index if not exists exercise_history_user_exercise_idx
  on public.exercise_history (user_id, exercise_id, completed_at desc);

create index if not exists exercise_history_user_session_idx
  on public.exercise_history (user_id, session_id);

alter table public.exercise_history enable row level security;

drop policy if exists "history select own" on public.exercise_history;
create policy "history select own" on public.exercise_history
  for select using (auth.uid() = user_id);

drop policy if exists "history insert own" on public.exercise_history;
create policy "history insert own" on public.exercise_history
  for insert with check (auth.uid() = user_id);

drop policy if exists "history update own" on public.exercise_history;
create policy "history update own" on public.exercise_history
  for update using (auth.uid() = user_id);

drop policy if exists "history delete own" on public.exercise_history;
create policy "history delete own" on public.exercise_history
  for delete using (auth.uid() = user_id);

-- ─── Body metrics (one row per measurement) ────────────────────────────────

create table if not exists public.body_metrics (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,1) not null,
  chest_cm numeric(5,1),
  waist_cm numeric(5,1),
  hips_cm numeric(5,1),
  body_fat_pct numeric(4,1),
  notes text,
  updated_at timestamptz not null default now()
);

create index if not exists body_metrics_user_date_idx
  on public.body_metrics (user_id, date desc);

alter table public.body_metrics enable row level security;

drop policy if exists "metrics select own" on public.body_metrics;
create policy "metrics select own" on public.body_metrics
  for select using (auth.uid() = user_id);

drop policy if exists "metrics insert own" on public.body_metrics;
create policy "metrics insert own" on public.body_metrics
  for insert with check (auth.uid() = user_id);

drop policy if exists "metrics update own" on public.body_metrics;
create policy "metrics update own" on public.body_metrics
  for update using (auth.uid() = user_id);

drop policy if exists "metrics delete own" on public.body_metrics;
create policy "metrics delete own" on public.body_metrics
  for delete using (auth.uid() = user_id);

-- ─── Body-metric goal (single row per user) ────────────────────────────────

create table if not exists public.body_metric_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  metric text not null default 'weightKg',
  start_kg numeric(5,1) not null,
  target_kg numeric(5,1) not null,
  updated_at timestamptz not null default now()
);

alter table public.body_metric_goals enable row level security;

drop policy if exists "goal select own" on public.body_metric_goals;
create policy "goal select own" on public.body_metric_goals
  for select using (auth.uid() = user_id);

drop policy if exists "goal insert own" on public.body_metric_goals;
create policy "goal insert own" on public.body_metric_goals
  for insert with check (auth.uid() = user_id);

drop policy if exists "goal update own" on public.body_metric_goals;
create policy "goal update own" on public.body_metric_goals
  for update using (auth.uid() = user_id);

drop policy if exists "goal delete own" on public.body_metric_goals;
create policy "goal delete own" on public.body_metric_goals
  for delete using (auth.uid() = user_id);
