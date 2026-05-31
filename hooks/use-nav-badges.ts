"use client";

import { selectUpcomingDays, usePlanStore } from "@/store";
import type { NavBadge } from "@/components/layout/nav-items";

/**
 * Resolves dynamic nav badge counts at render time. Keeps the count out of the
 * static `NAV_ITEMS` config so it always reflects live plan state.
 */
export function useNavBadges(): Record<NavBadge, number> {
  const plan = usePlanStore((s) => s.plan);
  const calendar = selectUpcomingDays(plan).filter(
    (day) => !day.rest && day.workout,
  ).length;

  return { calendar };
}
