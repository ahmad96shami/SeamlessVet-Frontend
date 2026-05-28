/**
 * Map an app language ("ar" | "en") to a BCP-47 tag with Palestine-sensible regions, *and*
 * pin the numbering system to Latin (`-u-nu-latn`) so Arabic-locale Intl output emits
 * `1,234.56` instead of `١٬٢٣٤٫٥٦`. The app's product decision is Latin digits everywhere
 * (Arabic shoppers in Palestine are used to Western-Arabic numerals, and the design system
 * pairs Latin numerics with tabular layouts).
 */
export function toBcp47(locale: string): string {
  return locale.startsWith("ar") ? "ar-PS-u-nu-latn" : "en-US";
}
