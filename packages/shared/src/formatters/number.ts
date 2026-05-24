import { DEFAULT_LOCALE } from "../constants";
import { toBcp47 } from "./_locale";

export function formatNumber(
  value: number,
  locale: string = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(toBcp47(locale), options).format(value);
}

/** Quantities are numeric(14,3) server-side — show up to 3 fractional digits. */
export function formatQuantity(value: number, locale: string = DEFAULT_LOCALE): string {
  return formatNumber(value, locale, { maximumFractionDigits: 3 });
}

/** `value` is a whole percentage (e.g. 12.5 → "12.5%"). */
export function formatPercent(value: number, locale: string = DEFAULT_LOCALE): string {
  return formatNumber(value / 100, locale, { style: "percent", maximumFractionDigits: 2 });
}
