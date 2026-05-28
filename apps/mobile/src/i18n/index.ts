import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import {
  baseI18nConfig,
  FALLBACK_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from "@vet/shared";

/**
 * Pick the initial language from the device locale (expo-localization). Only
 * Arabic / English are supported; everything else falls back to Arabic-first.
 * Persisted user override (MMKV) lands in Mo0 task 6 — until then this is
 * device-detected every launch.
 */
function detectInitialLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode ?? FALLBACK_LANGUAGE;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code)
    ? (code as AppLanguage)
    : FALLBACK_LANGUAGE;
}

void i18next.use(initReactI18next).init({
  ...baseI18nConfig,
  lng: detectInitialLanguage(),
  // Resources are bundled (sync init); no Suspense boundary needed.
  react: { useSuspense: false },
});

export default i18next;
