-- Heart-rate scaffolding (Etap 5: architecture-only).
--
-- This migration is the backend contract for the live-HR stream Etap 6 will
-- light up. It creates:
--   1. Additive HR columns on `public.profiles` (max/resting + zone method)
--   2. `public.heart_rate_samples` — per-sample append-only table
--   3. `public.heart_rate_devices` — registered straps / watches
-- All with RLS policies pinned to `auth.uid()`.
--
-- The realtime channel `hr:session:{session_id}` is consumed by the web app
-- in `lib/realtime/supabase-transport.ts`. Channel authorization (Realtime
-- RLS / Authorization) is NOT configured here — it MUST be added before any
-- live data flows, otherwise broadcasts would be world-readable.
-- TODO(Etap 6): configure `realtime.channels` policy so only the session
-- owner can subscribe to `hr:session:{session_id}`.
--
-- Idempotent: add column if not exists, create table if not exists,
-- drop policy if exists -> create policy.

-- ─── Profile HR columns ─────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists max_hr_bpm smallint,
  add column if not exists resting_hr_bpm smallint,
  add column if not exists hr_zone_method text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_max_hr_bpm_check') then
    alter table public.profiles
      add constraint profiles_max_hr_bpm_check
      check (max_hr_bpm is null or (max_hr_bpm between 60 and 240));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_resting_hr_bpm_check') then
    alter table public.profiles
      add constraint profiles_resting_hr_bpm_check
      check (resting_hr_bpm is null or (resting_hr_bpm between 30 and 120));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_hr_zone_method_check') then
    alter table public.profiles
      add constraint profiles_hr_zone_method_check
      check (hr_zone_method is null or hr_zone_method in ('percent_mhr', 'karvonen'));
  end if;
end $$;

-- ─── Devices ────────────────────────────────────────────────────────────────

create table if not exists public.heart_rate_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vendor text not null,
  model text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'heart_rate_devices_vendor_check') then
    alter table public.heart_rate_devices
      add constraint heart_rate_devices_vendor_check
      check (vendor in ('garmin', 'polar', 'wahoo', 'mock', 'manual'));
  end if;
end $$;

create index if not exists heart_rate_devices_user_idx
  on public.heart_rate_devices (user_id, last_seen_at desc);

alter table public.heart_rate_devices enable row level security;

drop policy if exists "hr_devices_select_own" on public.heart_rate_devices;
create policy "hr_devices_select_own" on public.heart_rate_devices
  for select using (auth.uid() = user_id);

drop policy if exists "hr_devices_insert_own" on public.heart_rate_devices;
create policy "hr_devices_insert_own" on public.heart_rate_devices
  for insert with check (auth.uid() = user_id);

drop policy if exists "hr_devices_update_own" on public.heart_rate_devices;
create policy "hr_devices_update_own" on public.heart_rate_devices
  for update using (auth.uid() = user_id);

drop policy if exists "hr_devices_delete_own" on public.heart_rate_devices;
create policy "hr_devices_delete_own" on public.heart_rate_devices
  for delete using (auth.uid() = user_id);

-- ─── Samples ────────────────────────────────────────────────────────────────

create table if not exists public.heart_rate_samples (
  session_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  ts timestamptz not null,
  bpm smallint not null,
  source text,
  device_id uuid references public.heart_rate_devices(id) on delete set null,
  server_ts timestamptz not null default now(),
  primary key (session_id, ts)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'heart_rate_samples_bpm_check') then
    alter table public.heart_rate_samples
      add constraint heart_rate_samples_bpm_check
      check (bpm between 20 and 250);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'heart_rate_samples_source_check') then
    alter table public.heart_rate_samples
      add constraint heart_rate_samples_source_check
      check (source is null or source in ('garmin', 'polar', 'wahoo', 'mock', 'manual'));
  end if;
end $$;

create index if not exists heart_rate_samples_user_idx
  on public.heart_rate_samples (user_id, ts desc);

create index if not exists heart_rate_samples_session_idx
  on public.heart_rate_samples (session_id, ts asc);

alter table public.heart_rate_samples enable row level security;

drop policy if exists "hr_samples_select_own" on public.heart_rate_samples;
create policy "hr_samples_select_own" on public.heart_rate_samples
  for select using (auth.uid() = user_id);

drop policy if exists "hr_samples_insert_own" on public.heart_rate_samples;
create policy "hr_samples_insert_own" on public.heart_rate_samples
  for insert with check (auth.uid() = user_id);

drop policy if exists "hr_samples_delete_own" on public.heart_rate_samples;
create policy "hr_samples_delete_own" on public.heart_rate_samples
  for delete using (auth.uid() = user_id);
