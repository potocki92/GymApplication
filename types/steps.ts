/**
 * Dzienne kroki — model źródło-agnostyczny.
 *
 * W v1 dane pochodzą wyłącznie z Apple Health (`apple_health_samples`, metryka
 * `steps`). Model trzyma `sources`, więc dołożenie dziennych podsumowań Garmina
 * (osobny endpoint + tabela) sprowadzi się do scalenia kolejnej serii per data,
 * bez zmian w UI wykresu czy celów.
 */

export type StepsSource = "apple_health" | "garmin";

export interface DailyStepsPoint {
  /** Lokalna data dnia (YYYY-MM-DD). */
  date: string;
  steps: number;
  /** Źródła, z których pochodzą kroki tego dnia (puste, gdy brak danych). */
  sources: StepsSource[];
}
