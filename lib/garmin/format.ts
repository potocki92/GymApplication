import type { GarminActivity } from "@/types/garmin";

export interface GarminActivitySummary {
  distance: string | null;
  duration: string | null;
  avgHr: string | null;
  maxHr: string | null;
  calories: string | null;
}

export function formatGarminActivity(activity: GarminActivity): GarminActivitySummary {
  return {
    distance: formatDistance(activity.distanceMeters),
    duration: formatDuration(activity.durationSeconds),
    avgHr: activity.avgHeartRateBpm ? `${activity.avgHeartRateBpm} bpm` : null,
    maxHr: activity.maxHeartRateBpm ? `${activity.maxHeartRateBpm} bpm` : null,
    calories: activity.calories ? `${activity.calories} kcal` : null,
  };
}

export function formatDistance(meters: number | null): string | null {
  if (meters == null || meters <= 0) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(seconds: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}
