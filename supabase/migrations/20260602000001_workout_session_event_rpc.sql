-- Workout session event-sourcing RPCs.
--
-- This migration intentionally adds only RPC functions and supporting indexes. It
-- assumes the event-sourcing schema migration has already extended
-- public.workout_sessions with active-session columns and created
-- public.workout_session_events.

-- Supporting indexes are created defensively so this RPC migration stays
-- re-runnable and does not fail in environments where the preceding schema
-- migration has not been applied yet.
do $$
begin
  if to_regclass('public.workout_sessions') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'workout_sessions'
        and column_name = 'status'
    ) then
    execute '
      create unique index if not exists workout_sessions_one_active_or_paused_uidx
        on public.workout_sessions (user_id)
        where status in (''active'', ''paused'')
    ';

    execute '
      create index if not exists workout_sessions_user_active_status_idx
        on public.workout_sessions (user_id, status, updated_at desc)
        where status in (''active'', ''paused'')
    ';
  end if;

  if to_regclass('public.workout_session_events') is not null then
    execute '
      create unique index if not exists workout_session_events_user_client_event_uidx
        on public.workout_session_events (user_id, client_event_id)
        where client_event_id is not null
    ';

    execute '
      create unique index if not exists workout_session_events_session_sequence_uidx
        on public.workout_session_events (session_id, sequence_number)
    ';

    execute '
      create index if not exists workout_session_events_session_created_idx
        on public.workout_session_events (session_id, created_at asc)
    ';
  end if;
end $$;

create or replace function public.start_workout_session(
  p_session_id text,
  p_workout_id text,
  p_workout_name text,
  p_device_id text,
  p_client_event_id text,
  p_initial_state jsonb
)
returns public.workout_sessions
language plpgsql
security invoker
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_started_at timestamptz := now();
  v_session public.workout_sessions;
  v_event record;
begin
  if v_user_id is null then
    raise exception 'start_workout_session requires an authenticated user'
      using errcode = '28000';
  end if;

  if nullif(trim(p_session_id), '') is null then
    raise exception 'p_session_id is required' using errcode = '22023';
  end if;

  if nullif(trim(p_workout_id), '') is null then
    raise exception 'p_workout_id is required' using errcode = '22023';
  end if;

  if nullif(trim(p_workout_name), '') is null then
    raise exception 'p_workout_name is required' using errcode = '22023';
  end if;

  if nullif(trim(p_client_event_id), '') is null then
    raise exception 'p_client_event_id is required' using errcode = '22023';
  end if;

  -- Idempotent retry after a successful start: return the already-created
  -- session for this client event instead of tripping the active-session guard.
  select e.*
    into v_event
  from public.workout_session_events e
  where e.user_id = v_user_id
    and e.client_event_id = p_client_event_id
    and e.event_type = 'WORKOUT_STARTED'
  limit 1;

  if found then
    select ws.*
      into v_session
    from public.workout_sessions ws
    where ws.id = v_event.session_id
      and ws.user_id = v_user_id;

    if found then
      return v_session;
    end if;

    raise exception 'Existing WORKOUT_STARTED event has no visible session'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from public.workout_sessions ws
    where ws.user_id = v_user_id
      and ws.status in ('active', 'paused')
      and ws.id <> p_session_id
  ) then
    raise exception 'User already has an active or paused workout session'
      using errcode = '23505';
  end if;

  insert into public.workout_sessions (
    id,
    user_id,
    workout_id,
    workout_name,
    started_at,
    finished_at,
    total_active_ms,
    status,
    current_state,
    version,
    device_id
  ) values (
    p_session_id,
    v_user_id,
    p_workout_id,
    p_workout_name,
    v_started_at,
    null,
    0,
    'active',
    coalesce(p_initial_state, '{}'::jsonb),
    1,
    p_device_id
  )
  returning * into v_session;

  insert into public.workout_session_events (
    session_id,
    user_id,
    event_type,
    payload,
    client_event_id,
    device_id,
    sequence_number
  ) values (
    p_session_id,
    v_user_id,
    'WORKOUT_STARTED',
    jsonb_build_object(
      'sessionId', p_session_id,
      'workoutId', p_workout_id,
      'workoutName', p_workout_name,
      'startedAt', v_started_at,
      'nextState', coalesce(p_initial_state, '{}'::jsonb)
    ),
    p_client_event_id,
    p_device_id,
    1
  )
  returning * into v_event;

  update public.workout_sessions ws
  set last_event_id = v_event.id,
      updated_at = now()
  where ws.id = p_session_id
    and ws.user_id = v_user_id
  returning * into v_session;

  return v_session;
exception
  when unique_violation then
    -- Best-effort idempotency for concurrent retries with the same client event.
    select e.*
      into v_event
    from public.workout_session_events e
    where e.user_id = v_user_id
      and e.client_event_id = p_client_event_id
      and e.event_type = 'WORKOUT_STARTED'
    limit 1;

    if found then
      select ws.*
        into v_session
      from public.workout_sessions ws
      where ws.id = v_event.session_id
        and ws.user_id = v_user_id;

      if found then
        return v_session;
      end if;
    end if;

    raise;
end;
$$;

create or replace function public.append_workout_session_event(
  p_session_id text,
  p_event_type text,
  p_payload jsonb,
  p_client_event_id text,
  p_device_id text,
  p_expected_version int,
  p_next_state jsonb,
  p_next_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session record;
  v_event record;
  v_next_sequence int;
begin
  if v_user_id is null then
    raise exception 'append_workout_session_event requires an authenticated user'
      using errcode = '28000';
  end if;

  if nullif(trim(p_session_id), '') is null then
    raise exception 'p_session_id is required' using errcode = '22023';
  end if;

  if nullif(trim(p_event_type), '') is null then
    raise exception 'p_event_type is required' using errcode = '22023';
  end if;

  if p_event_type !~ '^[A-Z][A-Z0-9_]*$' then
    raise exception 'Invalid workout session event type: %', p_event_type
      using errcode = '22023';
  end if;

  if nullif(trim(p_client_event_id), '') is null then
    raise exception 'p_client_event_id is required' using errcode = '22023';
  end if;

  if p_expected_version is null or p_expected_version < 1 then
    raise exception 'p_expected_version must be >= 1' using errcode = '22023';
  end if;

  if p_next_status is null or p_next_status not in ('active', 'paused', 'completed') then
    raise exception 'Invalid workout session status: %', p_next_status
      using errcode = '22023';
  end if;

  select ws.*
    into v_session
  from public.workout_sessions ws
  where ws.id = p_session_id
    and ws.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Workout session not found: %', p_session_id
      using errcode = 'P0002';
  end if;

  -- Idempotent retry: if this client event has already been accepted for the
  -- same session, return it even though the session version has already advanced.
  select e.*
    into v_event
  from public.workout_session_events e
  where e.user_id = v_user_id
    and e.session_id = p_session_id
    and e.client_event_id = p_client_event_id
  limit 1;

  if found then
    return to_jsonb(v_event);
  end if;

  if v_session.version <> p_expected_version then
    raise exception 'Workout session version conflict: expected %, got %',
      p_expected_version,
      v_session.version
      using errcode = '40001';
  end if;

  v_next_sequence := p_expected_version + 1;

  insert into public.workout_session_events (
    session_id,
    user_id,
    event_type,
    payload,
    client_event_id,
    device_id,
    sequence_number
  ) values (
    p_session_id,
    v_user_id,
    p_event_type,
    coalesce(p_payload, '{}'::jsonb),
    p_client_event_id,
    p_device_id,
    v_next_sequence
  )
  returning * into v_event;

  update public.workout_sessions ws
  set current_state = coalesce(p_next_state, '{}'::jsonb),
      status = p_next_status,
      version = v_next_sequence,
      last_event_id = v_event.id,
      finished_at = case
        when p_next_status = 'completed' then now()
        else ws.finished_at
      end,
      total_active_ms = case
        when p_next_status = 'completed'
          and coalesce(p_next_state->>'totalActiveMs', '') ~ '^[0-9]+$'
          then (p_next_state->>'totalActiveMs')::bigint
        else ws.total_active_ms
      end,
      updated_at = now()
  where ws.id = p_session_id
    and ws.user_id = v_user_id;

  return to_jsonb(v_event);
exception
  when unique_violation then
    -- If the unique violation was caused by a replayed client event, return the
    -- previously accepted event. Other uniqueness failures still bubble up.
    select e.*
      into v_event
    from public.workout_session_events e
    where e.user_id = v_user_id
      and e.session_id = p_session_id
      and e.client_event_id = p_client_event_id
    limit 1;

    if found then
      return to_jsonb(v_event);
    end if;

    raise;
end;
$$;
