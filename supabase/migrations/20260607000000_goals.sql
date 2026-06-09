-- Cele użytkownika (treningi/tydzień, kroki dzień/tydzień).
--
-- Postęp liczymy w aplikacji z istniejących danych (sesje, kroki), więc tu
-- trzymamy tylko definicję celu: typ + wartość docelowa. Jeden cel na typ na
-- użytkownika (unique user_id, type). RLS przypina wiersze do auth.uid().
--
-- Cel wagowy NIE jest tu modelowany — korzysta z `body_metric_goals`.

create table if not exists public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  target numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, type)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_goals_type_check') then
    alter table public.user_goals
      add constraint user_goals_type_check
      check (type in ('workouts_weekly', 'steps_daily', 'steps_weekly'));
  end if;
end $$;

create index if not exists user_goals_user_idx
  on public.user_goals (user_id);

alter table public.user_goals enable row level security;

drop policy if exists "goals select own" on public.user_goals;
create policy "goals select own" on public.user_goals
  for select using (auth.uid() = user_id);

drop policy if exists "goals insert own" on public.user_goals;
create policy "goals insert own" on public.user_goals
  for insert with check (auth.uid() = user_id);

drop policy if exists "goals update own" on public.user_goals;
create policy "goals update own" on public.user_goals
  for update using (auth.uid() = user_id);

drop policy if exists "goals delete own" on public.user_goals;
create policy "goals delete own" on public.user_goals
  for delete using (auth.uid() = user_id);
