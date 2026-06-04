/**
 * Arabic-Indic digit helpers (MoD.2). The design renders quantities, times and
 * money in Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩); SKUs / batch codes / phone numbers
 * stay Latin. Mirrors the design archive's `formatNumber` exactly.
 */

const DIGIT_MAP: Record<string, string> = {
  "0": "٠",
  "1": "١",
  "2": "٢",
  "3": "٣",
  "4": "٤",
  "5": "٥",
  "6": "٦",
  "7": "٧",
  "8": "٨",
  "9": "٩",
  ".": "٫",
};

/** Transliterate any Latin digits in `value` to Arabic-Indic (other chars pass through). */
export function toArabicDigits(value: string | number): string {
  return String(value)
    .split("")
    .map((c) => DIGIT_MAP[c] ?? c)
    .join("");
}

/** Format a number with Arabic-Indic digits + Arabic thousands separators (٬). */
export function formatArabicNumber(n: number): string {
  if (!Number.isFinite(n)) return "";
  try {
    return n.toLocaleString("ar-EG-u-nu-arab", { maximumFractionDigits: 2 });
  } catch {
    return toArabicDigits(n);
  }
}
