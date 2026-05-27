-- Workout-session headers.
--
-- exercise_history holds one row per completed set. We need a per-session header
-- to store metadata the user adds in the summary screen (rating, note) plus the
-- bounds (started_at, finished_at, total_active_ms, workout_name) so the history
-- list doesn't have to recompute them by scanning every set.
--
-- HR fields are placeholders for the Garmin integration (Etap 5). They live here
-- because the summary view is where avg / max are computed at save time.
--
-- Idempotent: `if not exists`, drop/create policy.

create table if not exists public.workout_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id text not null,
  workout_name text not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  total_active_ms bigint not null,
  total_volume_kg numeric(10,2) not null default 0,
  exercises_count int not null default 0,
  sets_completed int not null default 0,
  reps_completed int not null default 0,
  rating int,
  note text,
  avg_hr_bpm int,
  max_hr_bpm int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_finished_idx
  on public.workout_sessions (user_id, finished_at desc);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'workout_sessions_rating_check') then
    alter table public.workout_sessions
      add constraint workout_sessions_rating_check
      check (rating is null or rating between 1 and 5);
  end if;
end $$;

alter table public.workout_sessions enable row level security;

drop policy if exists "workout_sessions select own" on public.workout_sessions;
create policy "workout_sessions select own" on public.workout_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "workout_sessions insert own" on public.workout_sessions;
create policy "workout_sessions insert own" on public.workout_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "workout_sessions update own" on public.workout_sessions;
create policy "workout_sessions update own" on public.workout_sessions
  for update using (auth.uid() = user_id);

drop policy if exists "workout_sessions delete own" on public.workout_sessions;
create policy "workout_sessions delete own" on public.workout_sessions
  for delete using (auth.uid() = user_id);
