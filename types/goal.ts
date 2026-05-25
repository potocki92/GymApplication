export interface TrainingGoal {
  id: string;
  title: string;
  /** Completion percentage, 0-100. */
  progressPct: number;
  daysLeft: number;
}
