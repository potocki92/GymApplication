-- User profile expansion: onboarding + preferences.
--
-- Extends `public.profiles` with the personal/training fields collected during
-- onboarding plus the per-user preferences edited from /settings. Every column
-- is nullable (defaults where it makes sense) so existing rows survive the
-- migration without backfill.
--
-- Idempotent: `add column if not exists` and `drop policy if exists` -> `create policy`.
-- Safe to run multiple times.

-- ─── New columns on profiles ────────────────────────────────────────────────

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists gender text,
  add column if not exists birth_date date,
  add column if not exists height_cm numeric(5,1),
  add column if not exists current_weight_kg numeric(5,1),
  add column if not exists target_weight_kg numeric(5,1),
  add column if not exists training_goal text,
  add column if not exists experience_level text,
  add column if not exists available_equipment text[] not null default '{}'::text[],
  add column if not exists training_days_per_week int,
  add column if not exists preferred_workout_duration_min int,
  add column if not exists preferred_workout_types text[] not null default '{}'::text[],
  add column if not exists units_weight text not null default 'kg',
  add column if not exists units_length text not null default 'cm',
  add column if not exists theme_preference text not null default 'dark',
  add column if not exists notifications_enabled boolean not null default true,
  add column if not exists notifications_workout_reminders boolean not null default true,
  add column if not exists notifications_progress_updates boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

-- ─── Enum-style check constraints ────────────────────────────────────────────
-- Wrapped in DO blocks so they're idempotent across re-runs.

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_gender_check') then
    alter table public.profiles
      add constraint profiles_gender_check
      check (gender is null or gender in ('male', 'female', 'other'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_training_goal_check') then
    alter table public.profiles
      add constraint profiles_training_goal_check
      check (training_goal is null or training_goal in (
        'lose_fat', 'gain_muscle', 'maintain', 'strength', 'endurance', 'general_fitness'
      ));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_experience_level_check') then
    alter table public.profiles
      add constraint profiles_experience_level_check
      check (experience_level is null or experience_level in ('beginner', 'intermediate', 'advanced'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_training_days_check') then
    alter table public.profiles
      add constraint profiles_training_days_check
      check (training_days_per_week is null or training_days_per_week between 1 and 7);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_units_weight_check') then
    alter table public.profiles
      add constraint profiles_units_weight_check
      check (units_weight in ('kg', 'lbs'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_units_length_check') then
    alter table public.profiles
      add constraint profiles_units_length_check
      check (units_length in ('cm', 'in'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_theme_check') then
    alter table public.profiles
      add constraint profiles_theme_check
      check (theme_preference in ('dark', 'light', 'system'));
  end if;
end $$;

-- ─── Insert-own policy (the trigger covers signup; this lets the client
--      self-heal if a profile row is missing for an existing user). ───────────

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- ─── updated_at trigger ──────────────────────────────────────────────────────

create or replace function public.profiles_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.profiles_touch_updated_at();
