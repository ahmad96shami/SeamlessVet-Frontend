import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "../constants";
import { toBcp47 } from "./_locale";

const cache = new Map<string, Intl.NumberFormat>();

/** Format a money amount (default ILS) for the given app language. Uses Intl (cross-platform). */
export function formatCurrency(
  amount: number,
  locale: string = DEFAULT_LOCALE,
  currency: string = DEFAULT_CURRENCY,
): string {
  const key = `${locale}:${currency}`;
  let fmt = cache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(toBcp47(locale), {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    cache.set(key, fmt);
  }
  return fmt.format(amount);
}
