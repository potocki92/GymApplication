const MONTHS_GENITIVE_PL = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
];

const WEEKDAYS_FULL_PL = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
];

const WEEKDAYS_SHORT_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

const MONTHS_ABBR_PL = [
  "sty",
  "lut",
  "mar",
  "kwi",
  "maj",
  "cze",
  "lip",
  "sie",
  "wrz",
  "paź",
  "lis",
  "gru",
];

const MONTHS_NOMINATIVE_PL = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

const NBSP = " ";

/** Thousands-grouped number using a non-breaking space, e.g. 48250 -> "48 250". */
export function formatNumber(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

export function formatVolume(kg: number): string {
  return `${formatNumber(kg)}${NBSP}kg`;
}

export function formatKcal(kcal: number): string {
  return `${formatNumber(kcal)}${NBSP}kcal`;
}

/** Short duration that always reads in minutes, e.g. 60 -> "60 min". */
export function formatMinutes(minutes: number): string {
  return `${minutes}${NBSP}min`;
}

/** Long duration with hours, e.g. 245 -> "4 h 05 min", 45 -> "45 min". */
export function formatDurationLong(minutes: number): string {
  if (minutes < 60) return formatMinutes(minutes);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}${NBSP}h ${m.toString().padStart(2, "0")}${NBSP}min`;
}

export function formatRest(seconds: number): string {
  return `${seconds}${NBSP}sek`;
}

/** Milliseconds -> "HH:MM:SS" (or "MM:SS" when under an hour). Clamps negatives. */
export function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h.toString().padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

function parseISODate(iso: string): Date {
  // Treat date-only strings as local time to avoid timezone drift.
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
}

/** ISO date -> "21 maja". */
export function formatDatePL(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS_GENITIVE_PL[d.getMonth()]}`;
}

/** ISO date -> `{ day: 31, month: "maj" }` for compact day/month chips. */
export function formatDayMonthPL(iso: string): { day: number; month: string } {
  const d = parseISODate(iso);
  return { day: d.getDate(), month: MONTHS_ABBR_PL[d.getMonth()] };
}

/** ISO date -> "Wtorek, 21 maja". */
export function formatWeekdayDatePL(iso: string): string {
  const d = parseISODate(iso);
  return `${WEEKDAYS_FULL_PL[d.getDay()]}, ${formatDatePL(iso)}`;
}

/** ISO date -> "Pt, 24 maja". */
export function formatShortWeekdayDatePL(iso: string): string {
  const d = parseISODate(iso);
  return `${WEEKDAYS_SHORT_PL[d.getDay()]}, ${formatDatePL(iso)}`;
}

/** (year, 0-based month) -> "Maj 2024". */
export function formatMonthYearPL(year: number, month: number): string {
  return `${MONTHS_NOMINATIVE_PL[month]} ${year}`;
}
