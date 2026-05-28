import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import {
  baseI18nConfig,
  FALLBACK_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from "@vet/shared";

import { getStoredLanguage, setStoredLanguage } from "@/lib/langStorage";

/**
 * Initial language order: persisted user override (MMKV) → device locale
 * (expo-localization) → Arabic fallback. Unsupported device locales fall back
 * to Arabic-first.
 */
function detectInitialLanguage(): AppLanguage {
  const stored = getStoredLanguage();
  if (stored) return stored;
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

// Persist every change so the next launch picks it up.
i18next.on("languageChanged", (lng) => {
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(lng)) {
    setStoredLanguage(lng as AppLanguage);
  }
});

export function toggleLanguage(): void {
  const next: AppLanguage = i18next.resolvedLanguage === "ar" ? "en" : "ar";
  void i18next.changeLanguage(next);
}

export default i18next;
