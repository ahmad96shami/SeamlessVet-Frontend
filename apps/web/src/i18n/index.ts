import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { baseI18nConfig, FALLBACK_LANGUAGE, setApiErrorTranslator, type AppLanguage } from "@vet/shared";

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ...baseI18nConfig,
    detection: {
      // Arabic-first: <html lang="ar"> wins over the browser locale; a user's explicit
      // toggle is remembered in localStorage and takes precedence on the next visit.
      order: ["localStorage", "htmlTag", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "vet.lang",
    },
    react: { useSuspense: false }, // resources are bundled (sync init); no Suspense boundary needed
  });

// Every ApiError's `message` localises by its stable backend code at construction, so toasts
// (the central queryClient notify + the many `toast.error(e.message)` sites) read in the UI
// language. Unmapped codes fall back to the server's English text.
setApiErrorTranslator((code, fallback) => i18next.t(`apiErrors.${code}`, { defaultValue: fallback }));

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
