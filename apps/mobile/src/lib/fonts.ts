import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/tajawal";

/**
 * Tajawal is the design's primary face — Arabic-first with a graceful Latin
 * fallback. `useFonts` returns `[loaded, error]`; the root layout blocks render
 * until `loaded` is true so we never flash the system font (RN doesn't repaint
 * already-laid-out text when a custom face arrives later).
 *
 * Weight aliases match the Tailwind font-family tokens in tailwind.config.js:
 *   font-tajawal           → Tajawal (400, default)
 *   font-tajawal-bold      → Tajawal_700Bold
 *   font-tajawal-extrabold → Tajawal_800ExtraBold
 *
 * 500 is loaded for the rare medium-weight callouts; class names should still
 * prefer the four primary weights above for consistency.
 */
export function useAppFonts(): [boolean, Error | null] {
  return useFonts({
    Tajawal: Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
  });
}
