/**
 * Formats an ISO `YYYY-MM-DD` date as e.g. "5 marca 2026" using the dictionary
 * month names (`t.progressPhotos.months`). Falls back to the raw string for
 * malformed input.
 */
export function formatLongDate(iso: string, monthNames: readonly string[]): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${monthNames[m - 1]?.toLowerCase() ?? ""} ${y}`;
}
