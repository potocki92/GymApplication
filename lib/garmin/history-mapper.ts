import type { GarminActivity, SessionHistoryRecord } from "@/types";

/**
 * Projects a Garmin activity into the SessionHistoryRecord shape so the existing
 * history list can render both manual and synced sessions through one component.
 * Volume/sets/reps default to 0 because cardio activities don't carry them.
 */
export function garminActivityToSessionRecord(
  activity: GarminActivity,
): SessionHistoryRecord {
  const startMs = new Date(activity.startTime).getTime();
  const finishMs = startMs + activity.durationSeconds * 1000;

  return {
    id: `garmin:${activity.garminActivityId}`,
    workoutId: `garmin:${activity.activityType}`,
    workoutName: activityDisplayName(activity.activityType),
    startedAt: startMs,
    finishedAt: finishMs,
    totalActiveMs: activity.durationSeconds * 1000,
    totalVolumeKg: 0,
    exercisesCount: 0,
    setsCompleted: 0,
    repsCompleted: 0,
    avgHrBpm: activity.avgHeartRateBpm ?? undefined,
    maxHrBpm: activity.maxHeartRateBpm ?? undefined,
    source: "garmin",
    externalActivityId: activity.garminActivityId,
    activityType: activity.activityType,
    distanceMeters: activity.distanceMeters ?? undefined,
    calories: activity.calories ?? undefined,
  };
}

function activityDisplayName(type: string): string {
  switch (type) {
    case "running": return "Bieganie";
    case "cycling": return "Kolarstwo";
    case "swimming": return "Pływanie";
    case "strength": return "Trening siłowy";
    case "walking": return "Spacer";
    case "hiking": return "Górski";
    default: return "Aktywność Garmin";
  }
}
