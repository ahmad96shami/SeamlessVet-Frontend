import { formatNumber } from "@vet/shared";

/**
 * Latin digits APPWIDE (2026-06-04 product decision): no Arabic-Indic numerals
 * anywhere — money, counts, quantities, times and dates all render 0-9 in both
 * languages. This mirrors the shared formatters, which already pin `-u-nu-latn`
 * for the web; plain counts need no helper (render the number directly).
 */

/** Money-ish amounts: grouped, ≤2 decimals, Latin digits ("1,234.56"). */
export function formatAmount(n: number): string {
  if (!Number.isFinite(n)) return "";
  return formatNumber(n, "ar", { maximumFractionDigits: 2 });
}
