export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export interface ActivityDay {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  level: ActivityLevel;
}
