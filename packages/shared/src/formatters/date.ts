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

export const DATE_FORMAT = "yyyy/MM/dd";
// 12-hour clock — one convention for both locales: am/pm marker first, then time, then date
// ("م 4:01 2026/06/19" / "PM 4:01 2026/06/19"). Because the marker now LEADS the string, the
// whole value is wrapped in an LTR isolate (LRI…PDI) by `formatDateTime` so it renders in this
// exact order in every context — `dir="ltr"` cells AND bare RTL cells (notification list, visit
// timeline) alike — without per-cell anchoring. Date-fns `a` → "ص"/"م" (ar) or "AM"/"PM" (en).
export const DATE_TIME_FORMAT_AR = "a h:mm yyyy/MM/dd";
export const DATE_TIME_FORMAT_EN = "a h:mm yyyy/MM/dd";
/** Back-compat: callers that explicitly pass a pattern still work; locale-default uses the pair above. */
export const DATE_TIME_FORMAT = DATE_TIME_FORMAT_AR;

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
  pattern?: string,
): string {
  const resolved = pattern ?? (locale.startsWith("ar") ? DATE_TIME_FORMAT_AR : DATE_TIME_FORMAT_EN);
  const text = toLatinDigits(formatDateFns(toDate(value), resolved, { locale: localeFor(locale) }));
  // The Arabic am/pm marker (ar) leads the string; on its own it turns the following Latin digits
  // into Arabic-numbers (bidi rule W2) and the whole run flips back to date-first. Insert an LRM
  // (U+200E) right after the marker to keep the digits LTR, then wrap the value in an LTR isolate
  // (LRI U+2066 .. PDI U+2069) so it renders "<marker> <time> <date>" in every context.
  const anchored = text.replace(/^(\S+)(\s)/, "$1\u200E$2");
  return `\u2066${anchored}\u2069`;
}
