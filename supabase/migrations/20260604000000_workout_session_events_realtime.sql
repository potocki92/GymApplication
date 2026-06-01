-- Enable Supabase Realtime (postgres_changes) for the workout-session event log.
--
-- The cross-device sync seam (lib/supabase-workout-session-events.ts ->
-- subscribeWorkoutSessionEventInserts) listens for INSERT events on
-- public.workout_session_events via `postgres_changes`. Postgres only emits those
-- changes to Realtime when the table belongs to the `supabase_realtime` publication.
--
-- The schema migration (20260602000000_workout_session_events_schema.sql) created
-- the table and its RLS policies but never added it to the publication, so the
-- subscription connected (status SUBSCRIBED) yet received nothing and an active
-- session never synced between, e.g., a phone and a desktop. This migration closes
-- that gap.
--
-- Idempotent throughout (guarded `do $$` blocks) so it stays re-runnable.
--
-- Note: no REPLICA IDENTITY change is needed. We only subscribe to INSERT, and an
-- INSERT always carries the full new row, so the `session_id` filter and the RLS
-- check on `user_id` both work with the default replica identity. REPLICA IDENTITY
-- FULL would only matter for receiving old values on UPDATE/DELETE.

do $$ begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workout_session_events'
  ) then
    alter publication supabase_realtime add table public.workout_session_events;
  end if;
end $$;
