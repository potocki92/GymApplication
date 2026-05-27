import type {
  ActiveExercise,
  CompletedSession,
  SessionHistoryRecord,
} from "@/types";

function aggregateCounters(exercises: ActiveExercise[]): {
  setsCompleted: number;
  repsCompleted: number;
  totalVolumeKg: number;
} {
  let sets = 0;
  let reps = 0;
  let volume = 0;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      if (s.status !== "completed") continue;
      sets += 1;
      reps += s.actualReps ?? 0;
      volume += (s.actualReps ?? 0) * (s.actualWeightKg ?? 0);
    }
  }
  return { setsCompleted: sets, repsCompleted: reps, totalVolumeKg: volume };
}

/**
 * Build a session-history header from a freshly-completed session plus the
 * summary screen's rating/note. HR fields are filled when available — Etap 5/6
 * will start populating them.
 */
export function buildSessionHistoryRecord(
  session: CompletedSession,
): SessionHistoryRecord {
  const counters = aggregateCounters(session.exercises);
  return {
    id: session.id,
    workoutId: session.workoutId,
    workoutName: session.workoutName,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    totalActiveMs: session.totalActiveMs,
    totalVolumeKg: Math.round(counters.totalVolumeKg * 100) / 100,
    exercisesCount: session.exercises.length,
    setsCompleted: counters.setsCompleted,
    repsCompleted: counters.repsCompleted,
    rating: session.rating,
    note: session.note,
    avgHrBpm: session.heartRate?.avgBpm,
    maxHrBpm: session.heartRate?.maxBpm,
  };
}
