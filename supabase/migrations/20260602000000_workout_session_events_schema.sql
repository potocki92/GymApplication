-- Workout-session event-sourcing schema.
--
-- The RPC migration (20260602000001_workout_session_event_rpc.sql) and the
-- TypeScript seam (lib/supabase-workout-session-events.ts) both assume that
-- public.workout_sessions carries the active-session columns (status,
-- current_state, version, device_id, last_event_id) and that the append-only
-- public.workout_session_events table exists. That schema migration was never
-- committed, so deployed databases only have the completed-session header
-- columns from 20260528000000_workout_sessions.sql.
--
-- As a result every getActiveWorkoutSession() / start_workout_session() call
-- fails with `column workout_sessions.status does not exist` (Postgres 42703),
-- which blocks starting a workout from the plan view.
--
-- This migration backfills the missing schema. It runs before the RPC migration
-- (lower timestamp suffix) so the defensive index guards in that file see the
-- new `status` column. Idempotent throughout: `if not exists`, `drop ... if
-- exists`, and guarded `do $$` blocks so it stays re-runnable.

-- 1. Active-session columns on the existing header table.

alter table public.workout_sessions
  add column if not exists status text not null default 'completed',
  add column if not exists current_state jsonb not null default '{}'::jsonb,
  add column if not exists version int not null default 1,
  add column if not exists device_id text,
  add column if not exists last_event_id uuid;

-- Active sessions have no finish time yet; the RPC inserts finished_at = null.
-- The original header table created this column as NOT NULL, so relax it.
alter table public.workout_sessions
  alter column finished_at drop not null;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'workout_sessions_status_check'
  ) then
    alter table public.workout_sessions
      add constraint workout_sessions_status_check
      check (status in ('active', 'paused', 'completed'));
  end if;
end $$;

-- 2. Append-only event log.

create table if not exists public.workout_session_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  client_event_id text,
  device_id text,
  sequence_number int not null,
  created_at timestamptz not null default now()
);

-- last_event_id points at the most recent event for the session. Added after the
-- events table exists to satisfy the foreign key; guarded so it is re-runnable.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'workout_sessions_last_event_id_fkey'
  ) then
    alter table public.workout_sessions
      add constraint workout_sessions_last_event_id_fkey
      foreign key (last_event_id)
      references public.workout_session_events(id)
      on delete set null;
  end if;
end $$;

-- 3. Row level security: users only see and write their own rows. Inserts flow
-- through SECURITY INVOKER RPCs, so the insert policy is checked under the
-- caller's identity.

alter table public.workout_session_events enable row level security;

drop policy if exists "workout_session_events select own" on public.workout_session_events;
create policy "workout_session_events select own" on public.workout_session_events
  for select using (auth.uid() = user_id);

drop policy if exists "workout_session_events insert own" on public.workout_session_events;
create policy "workout_session_events insert own" on public.workout_session_events
  for insert with check (auth.uid() = user_id);
