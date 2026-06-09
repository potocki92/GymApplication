-- Szablony treningów (wielokrotnego użytku "przepisy" na trening).
--
-- Ćwiczenia trzymamy jako jsonb (ten sam kształt co `WorkoutExercise[]`), bo
-- szablon jest snapshotem konfiguracji, a nie znormalizowanym modelem. RLS
-- przypina wiersze do auth.uid() (pełny CRUD wykonuje zalogowany właściciel).

create table if not exists public.workout_templates (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text,
  exercises jsonb not null default '[]'::jsonb,
  estimated_duration_min int not null default 0,
  usage_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists workout_templates_user_created_idx
  on public.workout_templates (user_id, created_at desc);

alter table public.workout_templates enable row level security;

drop policy if exists "templates select own" on public.workout_templates;
create policy "templates select own" on public.workout_templates
  for select using (auth.uid() = user_id);

drop policy if exists "templates insert own" on public.workout_templates;
create policy "templates insert own" on public.workout_templates
  for insert with check (auth.uid() = user_id);

drop policy if exists "templates update own" on public.workout_templates;
create policy "templates update own" on public.workout_templates
  for update using (auth.uid() = user_id);

drop policy if exists "templates delete own" on public.workout_templates;
create policy "templates delete own" on public.workout_templates
  for delete using (auth.uid() = user_id);
