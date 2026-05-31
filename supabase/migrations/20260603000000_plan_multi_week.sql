-- Multi-week plan support.
--
-- The original `workouts` table modelled a single recurring weekly template,
-- keyed uniquely per (user, weekday). The calendar's planning board needs to
-- plan distinct calendar weeks, so we add a `week_start` dimension and move the
-- uniqueness to (user, week_start, weekday). Existing rows are backfilled to the
-- legacy template week ('2024-05-20', the seed WEEK_START) via the column
-- default, so the current single-week plan keeps working unchanged.

alter table public.workouts
  add column if not exists week_start date not null default '2024-05-20';

-- Swap the per-(user, weekday) uniqueness for per-(user, week, weekday).
alter table public.workouts
  drop constraint if exists workouts_user_id_weekday_key;

alter table public.workouts
  add constraint workouts_user_week_weekday_key
    unique (user_id, week_start, weekday);

create index if not exists workouts_user_week_idx
  on public.workouts (user_id, week_start);
