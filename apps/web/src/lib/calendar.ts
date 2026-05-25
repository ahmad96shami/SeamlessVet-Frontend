/**
 * Calendar date math for the appointments views. Native `Date` only — the web app has no `date-fns`
 * of its own (it lives in `@vet/shared`), and `Intl`/native math cover everything the grid needs.
 * All math is LOCAL time: blocks are positioned by the viewer's clock, and the query range is the
 * UTC projection of the local day bounds. The clinic week starts Sunday (the design's الأحد … السبت,
 * with الجمعة marked closed). Text is rendered elsewhere via `formatDate(d, lang, pattern)` so the
 * Arabic locale's Arabic-Indic numerals stay consistent with the rest of the app.
 */
export type CalendarView = "day" | "week" | "month";
export const CALENDAR_VIEWS: CalendarView[] = ["day", "week", "month"];

/** 0 = Sunday (matches Date.getDay()). */
const WEEK_START = 0;
/** Visible hours in the day/week time grid (08:00 → 18:00 = 10 one-hour rows). */
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 18;
export const HOUR_ROW_PX = 60;
/** Friday — the clinic's closed day (shaded in the grid). */
export const CLOSED_WEEKDAY = 5;
/** Backend default when an appointment has no explicit duration. */
export const DEFAULT_DURATION_MIN = 30;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}
export function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  return addDays(s, -((s.getDay() - WEEK_START + 7) % 7));
}
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}
export function isClosedDay(d: Date): boolean {
  return d.getDay() === CLOSED_WEEKDAY;
}

export function weekDays(anchor: Date): Date[] {
  const s = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}
/** A stable 6×7 month grid (always 42 cells), starting on the week that contains the 1st. */
export function monthGridDays(anchor: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(anchor));
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export interface ViewRange {
  days: Date[];
  /** Inclusive ISO bounds for GET /appointments?from&to (UTC projection of the local day bounds). */
  from: string;
  to: string;
}
export function viewRange(view: CalendarView, anchor: Date): ViewRange {
  const days =
    view === "day"
      ? [startOfDay(anchor)]
      : view === "week"
        ? weekDays(anchor)
        : monthGridDays(anchor);
  const first = days[0] ?? startOfDay(anchor);
  const last = days[days.length - 1] ?? first;
  const startNextDay = addDays(last, 1); // 00:00 of the day after the last
  return {
    days,
    from: first.toISOString(),
    to: new Date(startNextDay.getTime() - 1).toISOString(), // 23:59:59.999 of the last day
  };
}

/** Fractional hours since local midnight — vertical position in the time grid. */
export function hoursSinceMidnight(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

/** End of an appointment window (start + duration, defaulting to 30 min like the backend). */
export function appointmentEnd(start: Date, durationMin?: number | null): Date {
  return new Date(start.getTime() + (durationMin ?? DEFAULT_DURATION_MIN) * 60_000);
}

/** Do two half-open windows [aStart, aEnd) and [bStart, bEnd) overlap? (Back-to-back doesn't.) */
export function windowsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
/** Format a Date as the value an `<input type="datetime-local">` expects (local, no tz). */
export function toDateTimeLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
