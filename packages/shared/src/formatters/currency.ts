import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "../constants";
import { toBcp47 } from "./_locale";

const cache = new Map<string, Intl.NumberFormat>();

function formatter(locale: string, currency: string): Intl.NumberFormat {
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
  return fmt;
}

/** Format a money amount (default ILS) for the given app language. Uses Intl (cross-platform). */
export function formatCurrency(
  amount: number,
  locale: string = DEFAULT_LOCALE,
  currency: string = DEFAULT_CURRENCY,
): string {
  return formatter(locale, currency).format(amount);
}

/**
 * Split a money amount into its numeric body and its currency symbol so callers (`<Money>`)
 * can render them with different visual weight — typically a smaller, slightly muted symbol
 * next to the bold amount. Falls back to a single body string + empty symbol if Intl can't
 * separate parts (older runtimes).
 */
export function formatCurrencyParts(
  amount: number,
  locale: string = DEFAULT_LOCALE,
  currency: string = DEFAULT_CURRENCY,
): { body: string; symbol: string } {
  const fmt = formatter(locale, currency);
  if (typeof fmt.formatToParts !== "function") {
    return { body: fmt.format(amount), symbol: "" };
  }
  const parts = fmt.formatToParts(amount);
  let body = "";
  let symbol = "";
  for (const part of parts) {
    if (part.type === "currency") symbol += part.value;
    else body += part.value;
  }
  // Trim incidental whitespace from both sides — the consumer joins them with a small gap.
  return { body: body.trim(), symbol: symbol.trim() };
}
