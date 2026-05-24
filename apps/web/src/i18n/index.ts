import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { baseI18nConfig, FALLBACK_LANGUAGE, type AppLanguage } from "@vet/shared";

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ...baseI18nConfig,
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "vet.lang",
    },
    react: { useSuspense: false }, // resources are bundled (sync init); no Suspense boundary needed
  });

/** Mirror the active language onto <html dir/lang> (Arabic → RTL). */
export function applyDocumentDirection(language: string): void {
  const dir = language.startsWith("ar") ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = language;
}

applyDocumentDirection(i18next.resolvedLanguage ?? FALLBACK_LANGUAGE);
i18next.on("languageChanged", applyDocumentDirection);

export function toggleLanguage(): void {
  const current = i18next.resolvedLanguage ?? FALLBACK_LANGUAGE;
  const next: AppLanguage = current.startsWith("ar") ? "en" : "ar";
  void i18next.changeLanguage(next);
}

export default i18next;
