-- Apple Health integration (Etap 1: ingest przez iOS Skróty).
--
-- Użytkownik nie ma Maca, więc natywny HealthKit jest na teraz niedostępny. Dane
-- Apple Health trafiają do aplikacji przez Skrót robiący POST na
-- `/api/integrations/apple-health/ingest` z nagłówkiem `Authorization: Bearer <token>`.
--
-- Skrót nie nosi sesji-cookie Supabase, więc ingest NIE może polegać na `auth.uid()`.
-- Zamiast tego:
--   1. Token per-user trzymamy w `user_integrations.access_token` (provider 'apple_health').
--   2. Zapis idzie przez funkcję `public.ingest_apple_health(...)` SECURITY DEFINER,
--      która rozwiązuje `user_id` z tokenu i omija RLS (wzorzec jak
--      `20260602000001_workout_session_event_rpc.sql`).
--
-- Tabele danych są RLS-pinned do `auth.uid()` (odczyt z UI). Zapis robi wyłącznie
-- funkcja SECURITY DEFINER. Idempotentne: `if not exists`, drop/create policy.

-- ─── Rozszerzenie listy providerów o 'apple_health' ─────────────────────────

do $$ begin
  if exists (select 1 from pg_constraint where conname = 'user_integrations_provider_check') then
    alter table public.user_integrations
      drop constraint user_integrations_provider_check;
  end if;
  alter table public.user_integrations
    add constraint user_integrations_provider_check
    check (provider in ('garmin', 'polar', 'strava', 'wahoo', 'apple_health'));
end $$;

-- ─── Apple Health samples (kroki, energia, tętno) ───────────────────────────

create table if not exists public.apple_health_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null,
  value numeric not null,
  unit text,
  start_time timestamptz not null,
  end_time timestamptz,
  source text not null default 'apple_health',
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, metric, start_time)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'apple_health_samples_metric_check') then
    alter table public.apple_health_samples
      add constraint apple_health_samples_metric_check
      check (metric in ('steps', 'active_energy_kcal', 'resting_heart_rate', 'avg_heart_rate'));
  end if;
end $$;

create index if not exists apple_health_samples_user_metric_start_idx
  on public.apple_health_samples (user_id, metric, start_time desc);

alter table public.apple_health_samples enable row level security;

drop policy if exists "apple_health_samples_select_own" on public.apple_health_samples;
create policy "apple_health_samples_select_own" on public.apple_health_samples
  for select using (auth.uid() = user_id);

drop policy if exists "apple_health_samples_delete_own" on public.apple_health_samples;
create policy "apple_health_samples_delete_own" on public.apple_health_samples
  for delete using (auth.uid() = user_id);

-- ─── Apple Health ingest logs (audyt) ───────────────────────────────────────

create table if not exists public.apple_health_ingest_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  received_at timestamptz not null default now(),
  status text not null default 'success',
  samples_ingested int not null default 0,
  error_message text,
  trigger text not null default 'shortcut'
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'apple_health_ingest_logs_status_check') then
    alter table public.apple_health_ingest_logs
      add constraint apple_health_ingest_logs_status_check
      check (status in ('success', 'partial', 'error'));
  end if;
end $$;

create index if not exists apple_health_ingest_logs_user_received_idx
  on public.apple_health_ingest_logs (user_id, received_at desc);

alter table public.apple_health_ingest_logs enable row level security;

drop policy if exists "apple_health_ingest_logs_select_own" on public.apple_health_ingest_logs;
create policy "apple_health_ingest_logs_select_own" on public.apple_health_ingest_logs
  for select using (auth.uid() = user_id);

-- ─── Funkcja ingestu (SECURITY DEFINER, token-based) ────────────────────────
--
-- Wołana anon-klientem z route'a /ingest. Rozwiązuje user_id z tokenu, upsertuje
-- znormalizowane próbki, aktualizuje last_sync_at i dopisuje log. Walidacja kształtu
-- próbek odbywa się już po stronie TS (lib/apple-health/payload.ts); tutaj filtrujemy
-- defensywnie po dozwolonych metrykach.

create or replace function public.ingest_apple_health(
  p_token text,
  p_samples jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_count int := 0;
begin
  if nullif(trim(coalesce(p_token, '')), '') is null then
    raise exception 'ingest token is required' using errcode = '28000';
  end if;

  select user_id
    into v_user_id
  from public.user_integrations
  where provider = 'apple_health'
    and access_token = p_token
    and status = 'connected'
  limit 1;

  if v_user_id is null then
    raise exception 'invalid ingest token' using errcode = '28000';
  end if;

  if p_samples is null or jsonb_typeof(p_samples) <> 'array' then
    p_samples := '[]'::jsonb;
  end if;

  insert into public.apple_health_samples
    (user_id, metric, value, unit, start_time, end_time, source, raw)
  select
    v_user_id,
    s.metric,
    s.value,
    s.unit,
    s.start_time,
    s.end_time,
    coalesce(nullif(trim(s.source), ''), 'apple_health'),
    s.raw
  from jsonb_to_recordset(p_samples) as s(
    metric text,
    value numeric,
    unit text,
    start_time timestamptz,
    end_time timestamptz,
    source text,
    raw jsonb
  )
  where s.metric in ('steps', 'active_energy_kcal', 'resting_heart_rate', 'avg_heart_rate')
    and s.value is not null
    and s.start_time is not null
  on conflict (user_id, metric, start_time) do update set
    value = excluded.value,
    unit = excluded.unit,
    end_time = excluded.end_time,
    source = excluded.source,
    raw = excluded.raw;

  get diagnostics v_count = row_count;

  update public.user_integrations
  set last_sync_at = now(),
      last_error = null,
      updated_at = now()
  where user_id = v_user_id
    and provider = 'apple_health';

  insert into public.apple_health_ingest_logs
    (user_id, status, samples_ingested, trigger)
  values (v_user_id, 'success', v_count, 'shortcut');

  return jsonb_build_object('ingested', v_count, 'status', 'success');
end;
$$;

grant execute on function public.ingest_apple_health(text, jsonb) to anon, authenticated;
