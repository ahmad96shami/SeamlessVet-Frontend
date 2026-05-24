/** Map an app language ("ar" | "en") to a BCP-47 tag with Palestine-sensible regions. */
export function toBcp47(locale: string): string {
  return locale.startsWith("ar") ? "ar-PS" : "en-US";
}
