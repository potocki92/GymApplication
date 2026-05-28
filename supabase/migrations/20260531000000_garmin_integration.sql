-- Garmin Connect integration (Etap 5: historical sync).
--
-- Backend contract for the official OAuth 2.0 PKCE flow against Garmin
-- Health API. This migration creates:
--   1. `public.user_integrations`     — generic per-provider connection
--   2. `public.garmin_activities`      — synced activity headers
--   3. `public.garmin_heart_rate_samples` — per-activity HR samples (archival)
--   4. `public.garmin_sync_logs`       — audit log of every sync attempt
--
-- All tables RLS-pinned to `auth.uid()`. No third-party SSO credentials are
-- ever stored — only OAuth access/refresh tokens issued by Garmin.
--
-- Live heart-rate streaming (Etap 6) uses `public.heart_rate_samples`, NOT
-- `garmin_heart_rate_samples`. The two are intentionally separate: live HR
-- is session-scoped and realtime; this table is activity-scoped and archival.
--
-- Idempotent: `if not exists`, drop/create policy.

-- ─── User integrations (generic, per-provider) ──────────────────────────────

create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected',
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  external_user_id text,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_integrations_provider_check') then
    alter table public.user_integrations
      add constraint user_integrations_provider_check
      check (provider in ('garmin', 'polar', 'strava', 'wahoo'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_integrations_status_check') then
    alter table public.user_integrations
      add constraint user_integrations_status_check
      check (status in ('connected', 'disconnected', 'error', 'expired'));
  end if;
end $$;

create index if not exists user_integrations_user_provider_idx
  on public.user_integrations (user_id, provider);

alter table public.user_integrations enable row level security;

drop policy if exists "user_integrations_select_own" on public.user_integrations;
create policy "user_integrations_select_own" on public.user_integrations
  for select using (auth.uid() = user_id);

drop policy if exists "user_integrations_insert_own" on public.user_integrations;
create policy "user_integrations_insert_own" on public.user_integrations
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_integrations_update_own" on public.user_integrations;
create policy "user_integrations_update_own" on public.user_integrations
  for update using (auth.uid() = user_id);

drop policy if exists "user_integrations_delete_own" on public.user_integrations;
create policy "user_integrations_delete_own" on public.user_integrations
  for delete using (auth.uid() = user_id);

-- ─── Garmin activities ──────────────────────────────────────────────────────

create table if not exists public.garmin_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  garmin_activity_id text not null,
  activity_type text not null,
  start_time timestamptz not null,
  duration_seconds int not null,
  distance_meters numeric(10,2),
  calories int,
  avg_heart_rate_bpm smallint,
  max_heart_rate_bpm smallint,
  avg_speed_mps numeric(8,3),
  elevation_gain_m numeric(8,2),
  hr_zones jsonb,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, garmin_activity_id)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'garmin_activities_duration_check') then
    alter table public.garmin_activities
      add constraint garmin_activities_duration_check
      check (duration_seconds >= 0);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'garmin_activities_avg_hr_check') then
    alter table public.garmin_activities
      add constraint garmin_activities_avg_hr_check
      check (avg_heart_rate_bpm is null or (avg_heart_rate_bpm between 20 and 250));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'garmin_activities_max_hr_check') then
    alter table public.garmin_activities
      add constraint garmin_activities_max_hr_check
      check (max_heart_rate_bpm is null or (max_heart_rate_bpm between 20 and 250));
  end if;
end $$;

create index if not exists garmin_activities_user_start_idx
  on public.garmin_activities (user_id, start_time desc);

alter table public.garmin_activities enable row level security;

drop policy if exists "garmin_activities_select_own" on public.garmin_activities;
create policy "garmin_activities_select_own" on public.garmin_activities
  for select using (auth.uid() = user_id);

drop policy if exists "garmin_activities_insert_own" on public.garmin_activities;
create policy "garmin_activities_insert_own" on public.garmin_activities
  for insert with check (auth.uid() = user_id);

drop policy if exists "garmin_activities_update_own" on public.garmin_activities;
create policy "garmin_activities_update_own" on public.garmin_activities
  for update using (auth.uid() = user_id);

drop policy if exists "garmin_activities_delete_own" on public.garmin_activities;
create policy "garmin_activities_delete_own" on public.garmin_activities
  for delete using (auth.uid() = user_id);

-- ─── Garmin heart-rate samples (per-activity, archival) ─────────────────────

create table if not exists public.garmin_heart_rate_samples (
  user_id uuid not null references auth.users(id) on delete cascade,
  garmin_activity_id text not null,
  ts timestamptz not null,
  bpm smallint not null,
  primary key (user_id, garmin_activity_id, ts),
  foreign key (user_id, garmin_activity_id)
    references public.garmin_activities (user_id, garmin_activity_id)
    on delete cascade
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'garmin_hr_samples_bpm_check') then
    alter table public.garmin_heart_rate_samples
      add constraint garmin_hr_samples_bpm_check
      check (bpm between 20 and 250);
  end if;
end $$;

create index if not exists garmin_hr_samples_user_ts_idx
  on public.garmin_heart_rate_samples (user_id, ts desc);

alter table public.garmin_heart_rate_samples enable row level security;

drop policy if exists "garmin_hr_samples_select_own" on public.garmin_heart_rate_samples;
create policy "garmin_hr_samples_select_own" on public.garmin_heart_rate_samples
  for select using (auth.uid() = user_id);

drop policy if exists "garmin_hr_samples_insert_own" on public.garmin_heart_rate_samples;
create policy "garmin_hr_samples_insert_own" on public.garmin_heart_rate_samples
  for insert with check (auth.uid() = user_id);

drop policy if exists "garmin_hr_samples_delete_own" on public.garmin_heart_rate_samples;
create policy "garmin_hr_samples_delete_own" on public.garmin_heart_rate_samples
  for delete using (auth.uid() = user_id);

-- ─── Garmin sync logs (audit) ───────────────────────────────────────────────

create table if not exists public.garmin_sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'in_progress',
  activities_synced int not null default 0,
  samples_synced int not null default 0,
  error_message text,
  trigger text not null default 'manual'
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'garmin_sync_logs_status_check') then
    alter table public.garmin_sync_logs
      add constraint garmin_sync_logs_status_check
      check (status in ('success', 'partial', 'error', 'in_progress'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'garmin_sync_logs_trigger_check') then
    alter table public.garmin_sync_logs
      add constraint garmin_sync_logs_trigger_check
      check (trigger in ('manual', 'scheduled', 'webhook'));
  end if;
end $$;

create index if not exists garmin_sync_logs_user_started_idx
  on public.garmin_sync_logs (user_id, started_at desc);

alter table public.garmin_sync_logs enable row level security;

drop policy if exists "garmin_sync_logs_select_own" on public.garmin_sync_logs;
create policy "garmin_sync_logs_select_own" on public.garmin_sync_logs
  for select using (auth.uid() = user_id);

drop policy if exists "garmin_sync_logs_insert_own" on public.garmin_sync_logs;
create policy "garmin_sync_logs_insert_own" on public.garmin_sync_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "garmin_sync_logs_update_own" on public.garmin_sync_logs;
create policy "garmin_sync_logs_update_own" on public.garmin_sync_logs
  for update using (auth.uid() = user_id);
