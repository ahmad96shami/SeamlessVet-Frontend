import { format as formatDateFns } from "date-fns";
import { ar, enUS } from "date-fns/locale";

import { DEFAULT_LOCALE } from "../constants";

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

function localeFor(locale: string) {
  return locale.startsWith("ar") ? ar : enUS;
}

/**
 * date-fns's Arabic locale emits Arabic-Indic digits (٠..٩). The app's product decision is to
 * use Latin digits everywhere, so we map them back. Persian digits (۰..۹) are handled too for
 * any data that came in through a non-default Arabic locale upstream.
 */
function toLatinDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

/**
 * Anchor the Arabic am/pm marker so bidi doesn't reorder it past the date.
 *
 * Without help, "7:18ص 2026/05/28" in an LTR span renders visually as
 * "7:18 2026/05/28 ص" — the strong-RTL ص jumps past the following LTR digit run.
 * Inserting a U+200E LEFT-TO-RIGHT MARK right after ص/م forces a bidi-level break,
 * keeping the marker glued to the time where it logically belongs.
 */
function anchorAmPm(s: string): string {
  return s.replace(/([صم])(?!‎)/g, "$1‎");
}

export const DATE_FORMAT = "yyyy/MM/dd";
// 12-hour clock — visual layout "ص7:18 2026/05/28": am/pm marker first, then the time
// (glued to it), then space, then date. Date-fns `a` → "ص"/"م" (ar) or "AM"/"PM" (en).
export const DATE_TIME_FORMAT = "ah:mm yyyy/MM/dd";

/** Arabic-aware date formatting; digits forced to Latin via [[toLatinDigits]]. */
export function formatDate(
  value: DateInput,
  locale: string = DEFAULT_LOCALE,
  pattern: string = DATE_FORMAT,
): string {
  return toLatinDigits(formatDateFns(toDate(value), pattern, { locale: localeFor(locale) }));
}

export function formatDateTime(
  value: DateInput,
  locale: string = DEFAULT_LOCALE,
  pattern: string = DATE_TIME_FORMAT,
): string {
  return anchorAmPm(toLatinDigits(formatDateFns(toDate(value), pattern, { locale: localeFor(locale) })));
}
