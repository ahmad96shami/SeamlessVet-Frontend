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

export const DATE_FORMAT = "yyyy/MM/dd";
export const DATE_TIME_FORMAT = "yyyy/MM/dd HH:mm";

/** Arabic-aware date formatting (date-fns + `ar` locale). */
export function formatDate(
  value: DateInput,
  locale: string = DEFAULT_LOCALE,
  pattern: string = DATE_FORMAT,
): string {
  return formatDateFns(toDate(value), pattern, { locale: localeFor(locale) });
}

export function formatDateTime(
  value: DateInput,
  locale: string = DEFAULT_LOCALE,
  pattern: string = DATE_TIME_FORMAT,
): string {
  return formatDateFns(toDate(value), pattern, { locale: localeFor(locale) });
}
