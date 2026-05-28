-- Configurable access-control and subscription model.
--
-- The app must not authorize by a single user role only. This migration adds a
-- role + plan + feature graph that supports B2C users, trainers, gym/org owners,
-- admins and internal developers. UI gates use the same feature keys as API
-- routes, while RLS keeps ordinary users scoped to their own rows.

-- ─── Types as check constraints ────────────────────────────────────────────

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'users_role_check') then
    alter table public.users add constraint users_role_check
      check (role in ('user', 'trainer', 'gym_owner', 'admin', 'dev'));
  end if;
end $$;

alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create table if not exists public.features (
  key text primary key,
  label text not null,
  description text not null,
  category text not null,
  visibility text not null default 'public',
  experimental boolean not null default false,
  allow_direct_grant_when_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'features_visibility_check') then
    alter table public.features add constraint features_visibility_check
      check (visibility in ('public', 'hidden'));
  end if;
end $$;

alter table public.features enable row level security;

drop policy if exists "features_select_all" on public.features;
create policy "features_select_all" on public.features
  for select using (true);

create table if not exists public.plans (
  id text primary key,
  label text not null,
  description text not null,
  feature_keys text[] not null default '{}',
  max_training_plans int,
  max_clients int,
  max_trainers int,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;

drop policy if exists "plans_select_all" on public.plans;
create policy "plans_select_all" on public.plans
  for select using (active);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null default 'active',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  provider text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_status_check') then
    alter table public.subscriptions add constraint subscriptions_status_check
      check (status in ('trialing', 'active', 'past_due', 'canceled'));
  end if;
end $$;

create index if not exists subscriptions_user_status_idx
  on public.subscriptions (user_id, status, created_at desc);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

create table if not exists public.user_features (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null references public.features(key),
  enabled boolean not null default true,
  reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature_key)
);

create index if not exists user_features_user_idx on public.user_features (user_id);

alter table public.user_features enable row level security;

drop policy if exists "user_features_select_own" on public.user_features;
create policy "user_features_select_own" on public.user_features
  for select using (auth.uid() = user_id);

-- ─── Trainer/client and organization relationships ────────────────────────

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null default 'gym' references public.plans(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_owner_idx on public.organizations (owner_id);

alter table public.organizations enable row level security;

drop policy if exists "organizations_insert_owner" on public.organizations;
create policy "organizations_insert_owner" on public.organizations
  for insert with check (owner_id = auth.uid());

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  active boolean not null default true,
  permissions text[] not null default '{}',
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'organization_members_role_check') then
    alter table public.organization_members add constraint organization_members_role_check
      check (role in ('owner', 'manager', 'trainer', 'client'));
  end if;
end $$;

create index if not exists organization_members_user_idx
  on public.organization_members (user_id, active);

alter table public.organization_members enable row level security;

drop policy if exists "organizations_select_members" on public.organizations;
create policy "organizations_select_members" on public.organizations
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.organization_members om
      where om.organization_id = organizations.id
        and om.user_id = auth.uid()
        and om.active = true
    )
  );

drop policy if exists "organization_members_select_members" on public.organization_members;
create policy "organization_members_select_members" on public.organization_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.organizations org
      where org.id = organization_members.organization_id
        and org.owner_id = auth.uid()
    )
  );

create table if not exists public.trainer_clients (
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null default 'active',
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  primary key (trainer_id, client_id)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'trainer_clients_status_check') then
    alter table public.trainer_clients add constraint trainer_clients_status_check
      check (status in ('active', 'paused', 'ended'));
  end if;
end $$;

create index if not exists trainer_clients_client_idx
  on public.trainer_clients (client_id, status);

alter table public.trainer_clients enable row level security;

drop policy if exists "trainer_clients_select_participants" on public.trainer_clients;
create policy "trainer_clients_select_participants" on public.trainer_clients
  for select using (auth.uid() in (trainer_id, client_id));

-- ─── Plans assigned by trainers/organizations ──────────────────────────────

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'draft',
  feature_scope text[] not null default '{}',
  plan_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'training_plans_status_check') then
    alter table public.training_plans add constraint training_plans_status_check
      check (status in ('draft', 'published', 'archived'));
  end if;
end $$;

create index if not exists training_plans_owner_idx on public.training_plans (owner_id);
create index if not exists training_plans_org_idx on public.training_plans (organization_id);

alter table public.training_plans enable row level security;

drop policy if exists "training_plans_select_owner_or_org" on public.training_plans;
create policy "training_plans_select_owner_or_org" on public.training_plans
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.organization_members om
      where om.organization_id = training_plans.organization_id
        and om.user_id = auth.uid()
        and om.active = true
    )
  );

drop policy if exists "training_plans_insert_owner" on public.training_plans;
create policy "training_plans_insert_owner" on public.training_plans
  for insert with check (owner_id = auth.uid());

create table if not exists public.assigned_training_plans (
  id uuid primary key default gen_random_uuid(),
  training_plan_id uuid not null references public.training_plans(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'assigned_training_plans_status_check') then
    alter table public.assigned_training_plans add constraint assigned_training_plans_status_check
      check (status in ('active', 'paused', 'completed', 'canceled'));
  end if;
end $$;

create index if not exists assigned_training_plans_client_idx
  on public.assigned_training_plans (client_id, status);
create index if not exists assigned_training_plans_assigned_by_idx
  on public.assigned_training_plans (assigned_by);

alter table public.assigned_training_plans enable row level security;

drop policy if exists "assigned_training_plans_select_participants" on public.assigned_training_plans;
create policy "assigned_training_plans_select_participants" on public.assigned_training_plans
  for select using (auth.uid() in (client_id, assigned_by));

create table if not exists public.workout_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_training_plan_id uuid references public.assigned_training_plans(id) on delete set null,
  workout_id text,
  completed_at timestamptz not null,
  duration_min int not null default 0,
  volume_kg numeric(10,2) not null default 0,
  notes text,
  result_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workout_results_user_completed_idx
  on public.workout_results (user_id, completed_at desc);
create index if not exists workout_results_assigned_plan_idx
  on public.workout_results (assigned_training_plan_id);

alter table public.workout_results enable row level security;

drop policy if exists "workout_results_select_own" on public.workout_results;
create policy "workout_results_select_own" on public.workout_results
  for select using (auth.uid() = user_id);

drop policy if exists "workout_results_insert_own" on public.workout_results;
create policy "workout_results_insert_own" on public.workout_results
  for insert with check (auth.uid() = user_id);

-- ─── Seed configurable features and plans ──────────────────────────────────

insert into public.features (key, label, description, category, visibility, experimental)
values
  ('view_dashboard', 'Panel', 'Dostęp do panelu startowego.', 'core', 'public', false),
  ('manage_own_profile', 'Profil', 'Edycja własnego profilu i preferencji.', 'core', 'public', false),
  ('create_own_training_plan', 'Własny plan', 'Tworzenie planów treningowych dla siebie.', 'core', 'public', false),
  ('track_workouts', 'Rejestrowanie treningów', 'Zapisywanie wykonanych treningów i serii.', 'core', 'public', false),
  ('view_basic_history', 'Historia', 'Podgląd podstawowej historii treningów.', 'progress', 'public', false),
  ('view_progress_history', 'Historia progresu', 'Analiza dłuższej historii postępów.', 'progress', 'public', false),
  ('view_advanced_stats', 'Zaawansowane statystyki', 'Rozszerzone wykresy, trendy i porównania.', 'progress', 'public', false),
  ('use_ai_recommendations', 'Rekomendacje AI', 'Sugestie planów, progresji i regeneracji.', 'ai', 'public', false),
  ('export_data', 'Eksport danych', 'Eksport historii i raportów treningowych.', 'core', 'public', false),
  ('create_training_plan', 'Tworzenie planów', 'Tworzenie planów dla podopiecznych lub organizacji.', 'trainer', 'public', false),
  ('assign_training_plan', 'Przypisywanie planów', 'Przypisywanie planów konkretnym klientom.', 'trainer', 'public', false),
  ('view_client_workouts', 'Treningi klientów', 'Podgląd wykonanych treningów klientów.', 'trainer', 'public', false),
  ('view_client_progress', 'Progres klientów', 'Analiza progresu podopiecznych.', 'trainer', 'public', false),
  ('send_client_recommendations', 'Notatki i rekomendacje', 'Wysyłanie wiadomości, notatek i zaleceń klientom.', 'trainer', 'public', false),
  ('manage_organization', 'Organizacja', 'Zarządzanie siłownią lub organizacją.', 'organization', 'public', false),
  ('manage_trainers', 'Trenerzy', 'Dodawanie trenerów i zarządzanie ich uprawnieniami.', 'organization', 'public', false),
  ('manage_gym_clients', 'Klienci siłowni', 'Przypisywanie klientów do trenerów.', 'organization', 'public', false),
  ('view_organization_reports', 'Raporty organizacji', 'Podgląd aktywności trenerów i klientów.', 'organization', 'public', false),
  ('manage_system', 'Administracja systemem', 'Operacje administracyjne platformy.', 'admin', 'public', false),
  ('garmin_connect', 'Garmin Connect', 'Eksperymentalna integracja z Garmin Connect.', 'integration', 'hidden', true),
  ('experimental_features', 'Eksperymenty', 'Dostęp do funkcji ukrytych i eksperymentalnych.', 'experimental', 'hidden', true),
  ('hidden_dev_panel', 'Panel developerski', 'Wewnętrzne narzędzia diagnostyczne właścicieli aplikacji.', 'experimental', 'hidden', true)
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  visibility = excluded.visibility,
  experimental = excluded.experimental;

insert into public.plans (id, label, description, feature_keys, max_training_plans, max_clients, max_trainers)
values
  ('free', 'Free', 'Podstawowe funkcje dla użytkownika indywidualnego.', array['view_dashboard','manage_own_profile','create_own_training_plan','track_workouts'], 1, 0, 0),
  ('basic', 'Basic', 'Więcej planów i historia postępów.', array['view_dashboard','manage_own_profile','create_own_training_plan','track_workouts','view_basic_history','view_progress_history'], 3, 0, 0),
  ('pro', 'Pro', 'AI, statystyki i eksport danych.', array['view_dashboard','manage_own_profile','create_own_training_plan','track_workouts','view_basic_history','view_progress_history','view_advanced_stats','use_ai_recommendations','export_data'], 10, 0, 0),
  ('premium', 'Premium', 'Pełny pakiet dla użytkownika indywidualnego.', array['view_dashboard','manage_own_profile','create_own_training_plan','track_workouts','view_basic_history','view_progress_history','view_advanced_stats','use_ai_recommendations','export_data'], null, 0, 0),
  ('trainer', 'Trainer', 'Konto trenera do pracy z podopiecznymi.', array['view_dashboard','manage_own_profile','create_own_training_plan','track_workouts','view_basic_history','view_progress_history','view_advanced_stats','use_ai_recommendations','export_data','create_training_plan','assign_training_plan','view_client_workouts','view_client_progress','send_client_recommendations'], null, 50, 0),
  ('gym', 'Gym', 'Konto organizacji z trenerami, klientami i raportami.', array['view_dashboard','manage_own_profile','create_own_training_plan','track_workouts','view_basic_history','view_progress_history','view_advanced_stats','use_ai_recommendations','export_data','create_training_plan','assign_training_plan','view_client_workouts','view_client_progress','send_client_recommendations','manage_organization','manage_trainers','manage_gym_clients','view_organization_reports'], null, null, null),
  ('developer', 'Developer', 'Wewnętrzny plan właścicieli aplikacji z pełnym dostępem.', array['view_dashboard','manage_own_profile','create_own_training_plan','track_workouts','view_basic_history','view_progress_history','view_advanced_stats','use_ai_recommendations','export_data','create_training_plan','assign_training_plan','view_client_workouts','view_client_progress','send_client_recommendations','manage_organization','manage_trainers','manage_gym_clients','view_organization_reports','manage_system','garmin_connect','experimental_features','hidden_dev_panel'], null, null, null)
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  feature_keys = excluded.feature_keys,
  max_training_plans = excluded.max_training_plans,
  max_clients = excluded.max_clients,
  max_trainers = excluded.max_trainers;

-- Keep public.users in sync with Supabase auth users and legacy profiles.
create or replace function public.handle_new_user_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do update set email = excluded.email;

  if not exists (
    select 1 from public.subscriptions
    where user_id = new.id and status in ('trialing', 'active')
  ) then
    insert into public.subscriptions (user_id, plan_id, status)
    values (new.id, 'free', 'active');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_access on auth.users;
create trigger on_auth_user_created_access
  after insert on auth.users
  for each row execute function public.handle_new_user_access();
