const STORAGE_KEY = "fitflow.workoutSession.deviceId";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Returns the stable identity for this browser tab/app instance. It is scoped to
 * sessionStorage (not localStorage) so two open tabs can still sync each other's
 * events through Supabase Realtime instead of incorrectly treating them as self
 * echoes.
 */
export function getWorkoutSessionDeviceId(): string | null {
  const storage = browserStorage();
  if (!storage) return null;

  const existing = storage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const next = `device-${randomId()}`;
  storage.setItem(STORAGE_KEY, next);
  return next;
}

export function resetWorkoutSessionDeviceIdForTests(): void {
  browserStorage()?.removeItem(STORAGE_KEY);
}
