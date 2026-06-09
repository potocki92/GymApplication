import type { AppleHealthSample, DailyStepsPoint, StepsSource } from "@/types";

/**
 * Czyste agregacje dziennych kroków. Bucketowanie po **lokalnej** dacie (a nie
 * UTC), bo "dziś" w kroku użytkownika to dzień kalendarzowy w jego strefie —
 * spójnie z `currentLocalISODate` używanym na Dashboardzie.
 */

/** Lokalny klucz dnia YYYY-MM-DD (strefa przeglądarki). */
function localDayKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Gęsta seria dziennych kroków dla ostatnich `days` dni (kończąc dziś), z zerami
 * dla dni bez danych — dzięki temu oś X wykresu jest równa. Sumuje wartości
 * próbek per dzień (Apple Health potrafi przysłać kilka próbek na dobę).
 */
export function buildDailySteps(
  samples: readonly AppleHealthSample[],
  days = 90,
  now: Date = new Date(),
  source: StepsSource = "apple_health",
): DailyStepsPoint[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const byDay = new Map<string, number>();
  for (const s of samples) {
    if (s.metric !== "steps") continue;
    const value = Number(s.value);
    if (!Number.isFinite(value) || value <= 0) continue;
    const key = localDayKey(new Date(s.startTime));
    byDay.set(key, (byDay.get(key) ?? 0) + value);
  }

  const points: DailyStepsPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localDayKey(d);
    const steps = Math.round(byDay.get(key) ?? 0);
    points.push({ date: key, steps, sources: steps > 0 ? [source] : [] });
  }
  return points;
}

/** Kroki z dzisiejszego dnia (0, gdy brak danych). */
export function todaySteps(
  points: readonly DailyStepsPoint[],
  now: Date = new Date(),
): number {
  const key = localDayKey(now);
  return points.find((p) => p.date === key)?.steps ?? 0;
}

/** Suma kroków z ostatnich `days` dni (domyślnie 7, włącznie z dziś). */
export function sumStepsInLastDays(
  points: readonly DailyStepsPoint[],
  days = 7,
  now: Date = new Date(),
): number {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const keys = new Set<string>();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keys.add(localDayKey(d));
  }
  return points.reduce((sum, p) => (keys.has(p.date) ? sum + p.steps : sum), 0);
}

/** Suma kroków z bieżącego tygodnia kroczącego (ostatnie 7 dni). */
export function weeklyStepsTotal(
  points: readonly DailyStepsPoint[],
  now: Date = new Date(),
): number {
  return sumStepsInLastDays(points, 7, now);
}

/** Średnia dzienna z ostatnich 7 dni (zaokrąglona). */
export function weeklyStepsAverage(
  points: readonly DailyStepsPoint[],
  now: Date = new Date(),
): number {
  return Math.round(weeklyStepsTotal(points, now) / 7);
}

/** Najlepszy dzień (maks. kroków) w serii — 0, gdy brak danych. */
export function bestDaySteps(points: readonly DailyStepsPoint[]): number {
  return points.reduce((max, p) => Math.max(max, p.steps), 0);
}
