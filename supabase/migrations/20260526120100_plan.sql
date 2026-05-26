-- FitFlow weekly plan schema (Phase 6 follow-up).
--
-- One `workouts` row per (user, weekday) slot. A slot can be marked as a rest
-- day (`rest = true`, no exercises) or a training day (`rest = false`, joined
-- with rows in `workout_exercises`). Missing rows = "open" slot (no rest, no
-- workout); the client fills those defaults on load.

-- ─── Workouts ──────────────────────────────────────────────────────────────

create table if not exists public.workouts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday text not null
    check (weekday in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  rest boolean not null default false,
  name text,
  type text,
  estimated_duration_min int not null default 60,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, weekday)
);

create index if not exists workouts_user_idx on public.workouts (user_id);

alter table public.workouts enable row level security;

drop policy if exists "workouts select own" on public.workouts;
create policy "workouts select own" on public.workouts
  for select using (auth.uid() = user_id);

drop policy if exists "workouts insert own" on public.workouts;
create policy "workouts insert own" on public.workouts
  for insert with check (auth.uid() = user_id);

drop policy if exists "workouts update own" on public.workouts;
create policy "workouts update own" on public.workouts
  for update using (auth.uid() = user_id);

drop policy if exists "workouts delete own" on public.workouts;
create policy "workouts delete own" on public.workouts
  for delete using (auth.uid() = user_id);

-- ─── Workout exercises (configured set per workout) ────────────────────────

create table if not exists public.workout_exercises (
  id text primary key,
  workout_id text not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_index int not null default 0,
  exercise_id text not null,
  sets int not null,
  reps text not null,
  weight_kg numeric(7,2) not null default 0,
  rest_sec int not null default 60
);

create index if not exists workout_exercises_workout_idx
  on public.workout_exercises (workout_id, order_index);

create index if not exists workout_exercises_user_idx
  on public.workout_exercises (user_id);

alter table public.workout_exercises enable row level security;

drop policy if exists "we select own" on public.workout_exercises;
create policy "we select own" on public.workout_exercises
  for select using (auth.uid() = user_id);

drop policy if exists "we insert own" on public.workout_exercises;
create policy "we insert own" on public.workout_exercises
  for insert with check (auth.uid() = user_id);

drop policy if exists "we update own" on public.workout_exercises;
create policy "we update own" on public.workout_exercises
  for update using (auth.uid() = user_id);

drop policy if exists "we delete own" on public.workout_exercises;
create policy "we delete own" on public.workout_exercises
  for delete using (auth.uid() = user_id);
