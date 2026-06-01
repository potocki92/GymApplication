import type { UserProfile } from "@/types";

const DAY_MS = 86_400_000;

function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Monday-anchored start of the week containing `date` (local midnight). */
function mondayWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayBased = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - mondayBased);
  return d;
}

export interface ProgramWeek {
  /** 1-based week within the program, clamped to `[1, total]`. */
  week: number;
  total: number;
}

/**
 * The user's current program week (e.g. `{ week: 6, total: 12 }` → "Tydzień 6/12").
 * Counts whole Monday-based weeks since `programStartDate`. Returns `null` when the
 * profile has no program configured, so callers can hide the badge gracefully.
 */
export function currentProgramWeek(
  profile:
    | Pick<UserProfile, "programStartDate" | "programWeeks">
    | null
    | undefined,
  now: Date = new Date(),
): ProgramWeek | null {
  const total = profile?.programWeeks ?? null;
  if (!profile?.programStartDate || total == null || total < 1) return null;

  const start = parseLocalDate(profile.programStartDate);
  if (Number.isNaN(start.getTime())) return null;

  const startWeek = mondayWeekStart(start).getTime();
  const nowWeek = mondayWeekStart(now).getTime();
  // Round (not floor) so a 1h DST shift between the two week-starts can't drop a week.
  const weeksElapsed = Math.round((nowWeek - startWeek) / (7 * DAY_MS));
  const week = Math.min(Math.max(weeksElapsed + 1, 1), total);
  return { week, total };
}
