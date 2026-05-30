import { subscribeWorkoutSessionEventInserts, getWorkoutSessionEventsAfter } from "@/lib/supabase-workout-session-events";
import { WorkoutSessionRealtimeManager } from "@/lib/workout-session-realtime-manager";
import { useActiveSessionStore } from "@/store/use-active-session-store";

export const workoutSessionRealtimeManager = new WorkoutSessionRealtimeManager({
  getState: () => useActiveSessionStore.getState().getRealtimeSyncState(),
  subscribe: subscribeWorkoutSessionEventInserts,
  fetchEventsAfter: getWorkoutSessionEventsAfter,
  applyEvents: (events) => useActiveSessionStore.getState().applyRemoteWorkoutSessionEvents(events),
});
