export const DASHBOARD_CACHE_TTL_MS = 3 * 60 * 1000;

const CACHE_VERSION = 1;
const KEY_PREFIX = "fitflow-dashboard-cache";

export type DashboardCacheScope = "profile" | "plan" | "sessions" | "metrics";

interface DashboardCacheEnvelope<T> {
  version: typeof CACHE_VERSION;
  savedAt: number;
  data: T;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function cacheKey(scope: DashboardCacheScope, userId: string): string {
  return `${KEY_PREFIX}:${scope}:${encodeURIComponent(userId)}`;
}

function isEnvelope<T>(value: unknown): value is DashboardCacheEnvelope<T> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DashboardCacheEnvelope<T>>;
  return (
    candidate.version === CACHE_VERSION &&
    typeof candidate.savedAt === "number" &&
    Number.isFinite(candidate.savedAt) &&
    "data" in candidate
  );
}

export function isDashboardCacheFresh(
  savedAt: number,
  now = Date.now(),
  ttlMs = DASHBOARD_CACHE_TTL_MS,
): boolean {
  return savedAt <= now && now - savedAt < ttlMs;
}

export interface DashboardCacheHit<T> {
  data: T;
  savedAt: number;
}

export function readDashboardCacheEntry<T>(
  scope: DashboardCacheScope,
  userId: string,
  now = Date.now(),
  ttlMs = DASHBOARD_CACHE_TTL_MS,
): DashboardCacheHit<T> | null {
  const localStorage = storage();
  if (!localStorage) return null;

  try {
    const raw = localStorage.getItem(cacheKey(scope, userId));
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isEnvelope<T>(parsed)) return null;
    if (!isDashboardCacheFresh(parsed.savedAt, now, ttlMs)) return null;

    return { data: parsed.data, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function readDashboardCache<T>(
  scope: DashboardCacheScope,
  userId: string,
  now = Date.now(),
  ttlMs = DASHBOARD_CACHE_TTL_MS,
): T | null {
  return readDashboardCacheEntry<T>(scope, userId, now, ttlMs)?.data ?? null;
}

export function writeDashboardCache<T>(
  scope: DashboardCacheScope,
  userId: string,
  data: T,
  now = Date.now(),
): void {
  const localStorage = storage();
  if (!localStorage) return;

  try {
    const envelope: DashboardCacheEnvelope<T> = {
      version: CACHE_VERSION,
      savedAt: now,
      data,
    };
    localStorage.setItem(cacheKey(scope, userId), JSON.stringify(envelope));
  } catch {
    /* Best effort cache: storage quota/private mode must not break the app. */
  }
}

export function clearDashboardCache(
  scope: DashboardCacheScope,
  userId: string,
): void {
  const localStorage = storage();
  if (!localStorage) return;

  try {
    localStorage.removeItem(cacheKey(scope, userId));
  } catch {
    /* Best effort cache cleanup. */
  }
}
