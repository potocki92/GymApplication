-- Training program tracking on the user profile.
-- Powers the dashboard "Week N / M" badge (Tydzień N/M) on the today's-workout card.
alter table public.profiles
  add column if not exists program_start_date date,
  add column if not exists program_weeks int
    check (program_weeks is null or program_weeks between 1 and 52);
