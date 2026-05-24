import i18next, { type i18n, type InitOptions } from "i18next";

import ar from "./ar.json";
import en from "./en.json";

export type AppLanguage = "ar" | "en";

export const SUPPORTED_LANGUAGES = ["ar", "en"] as const satisfies readonly AppLanguage[];
/** Arabic is the default/primary language (Arabic-first, RTL). */
export const FALLBACK_LANGUAGE: AppLanguage = "ar";
export const DEFAULT_NS = "common";

/**
 * Translation resources, namespaced under "common".
 * Key convention: dot-nested by feature — `auth.login.title`, `actions.save`.
 */
export const resources = {
  ar: { common: ar },
  en: { common: en },
} as const;

/**
 * Base i18next options shared by both apps. Each app builds its own instance and
 * adds its own language detector + framework binding, e.g.:
 *
 *   web:    i18next.use(LanguageDetector).use(initReactI18next).init({ ...baseI18nConfig });
 *   mobile: i18next.use(initReactI18next).init({ ...baseI18nConfig, lng: deviceLanguage });
 */
export const baseI18nConfig: InitOptions = {
  resources,
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  defaultNS: DEFAULT_NS,
  ns: [DEFAULT_NS],
  interpolation: { escapeValue: false }, // React/RN escape on render
  returnNull: false,
};

/** Standalone, ready-to-use instance for tests / non-React contexts. */
export function createI18n(overrides?: Partial<InitOptions>): i18n {
  const instance = i18next.createInstance();
  void instance.init({ ...baseI18nConfig, lng: FALLBACK_LANGUAGE, ...overrides });
  return instance;
}
