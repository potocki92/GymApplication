-- Progress photos: user-uploaded body photos for visual progress tracking.
--
-- Layout:
--   public.progress_photos       — one row per uploaded photo (metadata)
--   storage bucket "progress-photos" (private) — actual image files at
--                                                {user_id}/{photo_id}.webp and
--                                                {user_id}/{photo_id}.thumb.webp
--
-- All access is gated by RLS keyed off auth.uid(). Storage policies enforce
-- that a user can only read/write objects under their own user_id prefix —
-- the first path segment must equal the caller's uid.

-- ─── Enum: pose ─────────────────────────────────────────────────────────────

do $$ begin
  create type public.progress_pose as enum ('front', 'side', 'back');
exception when duplicate_object then null; end $$;

-- ─── Table ──────────────────────────────────────────────────────────────────

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  taken_at date not null,
  pose public.progress_pose not null,
  storage_path text not null,
  thumb_path text not null,
  weight_kg numeric(5,2),
  notes text,
  width int,
  height int,
  byte_size int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists progress_photos_user_date_idx
  on public.progress_photos (user_id, taken_at desc);

create index if not exists progress_photos_user_pose_date_idx
  on public.progress_photos (user_id, pose, taken_at desc);

-- Reuse the global updated_at trigger fn if it exists; otherwise create it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists progress_photos_set_updated_at on public.progress_photos;
create trigger progress_photos_set_updated_at
  before update on public.progress_photos
  for each row execute function public.set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table public.progress_photos enable row level security;

drop policy if exists "progress_photos select own" on public.progress_photos;
create policy "progress_photos select own" on public.progress_photos
  for select using (auth.uid() = user_id);

drop policy if exists "progress_photos insert own" on public.progress_photos;
create policy "progress_photos insert own" on public.progress_photos
  for insert with check (auth.uid() = user_id);

drop policy if exists "progress_photos update own" on public.progress_photos;
create policy "progress_photos update own" on public.progress_photos
  for update using (auth.uid() = user_id);

drop policy if exists "progress_photos delete own" on public.progress_photos;
create policy "progress_photos delete own" on public.progress_photos
  for delete using (auth.uid() = user_id);

-- ─── Storage bucket + policies ──────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Path convention: "{user_id}/{anything}". storage.foldername(name)[1] is the
-- first path segment, which we constrain to the caller's auth.uid().

drop policy if exists "progress_photos storage select own" on storage.objects;
create policy "progress_photos storage select own" on storage.objects
  for select using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "progress_photos storage insert own" on storage.objects;
create policy "progress_photos storage insert own" on storage.objects
  for insert with check (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "progress_photos storage update own" on storage.objects;
create policy "progress_photos storage update own" on storage.objects
  for update using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "progress_photos storage delete own" on storage.objects;
create policy "progress_photos storage delete own" on storage.objects
  for delete using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
