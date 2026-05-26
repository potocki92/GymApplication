/** Standard Olympic barbell — used as the default empty-bar weight. */
export const DEFAULT_BAR_KG = 20;

/** European plate sizes, in kg, descending. */
export const DEFAULT_PLATES_KG: readonly number[] = [
  25, 20, 15, 10, 5, 2.5, 2, 1.5, 1, 0.5,
] as const;

export interface PlateResult {
  /** Weight to load on EACH side of the bar, in kg. */
  perSide: number;
  /** Plates on one side, ordered largest to smallest. */
  plates: number[];
  /** Weight that could not be matched exactly with the given plate set. */
  remainder: number;
  /** True when the target is lighter than the empty bar. */
  belowBar: boolean;
}

/**
 * Greedy plate breakdown for a barbell. Returns the per-side plate list, ordered
 * from largest to smallest, plus any remainder that couldn't be matched exactly
 * with the given plate denominations.
 */
export function calculatePlates(
  targetKg: number,
  barKg: number = DEFAULT_BAR_KG,
  plateSizes: readonly number[] = DEFAULT_PLATES_KG,
): PlateResult {
  if (targetKg < barKg) {
    return {
      perSide: 0,
      plates: [],
      remainder: Math.round((targetKg - barKg) * 1000) / 1000,
      belowBar: true,
    };
  }
  const perSide = (targetKg - barKg) / 2;
  const sorted = [...plateSizes].sort((a, b) => b - a);
  const plates: number[] = [];
  let remaining = perSide;
  for (const p of sorted) {
    while (remaining >= p - 1e-6) {
      plates.push(p);
      remaining = Math.round((remaining - p) * 1000) / 1000;
    }
  }
  return {
    perSide,
    plates,
    remainder: Math.round(remaining * 1000) / 1000,
    belowBar: false,
  };
}
