import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { z } from "zod";
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

// Every ApiError's `message` localises by its stable backend code at construction, so the central
// queryClient error toast (the single `notify` authority) reads in the UI language. Unmapped codes
// fall back to the server's English text.
setApiErrorTranslator((code, fallback) => i18next.t(`apiErrors.${code}`, { defaultValue: fallback }));

/** Mirror the active language onto <html dir/lang> (Arabic → RTL). */
export function applyDocumentDirection(language: string): void {
  const dir = language.startsWith("ar") ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = language;
}

// Localize Zod's built-in validation messages so the inline field errors under inputs read in the
// UI language — without this they fall back to Zod's English defaults. Re-applied on language
// change. Covers every schema (local + @vet/shared) since both resolve to the one hoisted zod
// instance. `customError` cleans up the two cases the built-in locale phrases awkwardly (it leaks
// the literal type name, e.g. "… string …"): an empty required field reads "هذا الحقل مطلوب", and a
// string min-length reads "… N أحرف"; everything else falls through to the locale.
function applyZodLocale(language: string): void {
  const locale = language.startsWith("ar") ? z.locales.ar() : z.locales.en();
  z.config({
    localeError: locale.localeError,
    customError: (issue) => {
      if (issue.code === "invalid_type" && (issue.expected === "string" || issue.expected === "number")) {
        return i18next.t("validation.required");
      }
      if (issue.code === "too_small" && issue.origin === "string") {
        const min = Number(issue.minimum);
        return min <= 1
          ? i18next.t("validation.required")
          : i18next.t("validation.minChars", { count: min });
      }
      return undefined; // fall back to the localized built-in message
    },
  });
}

applyDocumentDirection(i18next.resolvedLanguage ?? FALLBACK_LANGUAGE);
applyZodLocale(i18next.resolvedLanguage ?? FALLBACK_LANGUAGE);
i18next.on("languageChanged", applyDocumentDirection);
i18next.on("languageChanged", applyZodLocale);

export function toggleLanguage(): void {
  const current = i18next.resolvedLanguage ?? FALLBACK_LANGUAGE;
  const next: AppLanguage = current.startsWith("ar") ? "en" : "ar";
  void i18next.changeLanguage(next);
}

export default i18next;
