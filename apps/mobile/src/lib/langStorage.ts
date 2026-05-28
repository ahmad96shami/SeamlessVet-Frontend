import { prefs } from "@/services/mmkv";
import { SUPPORTED_LANGUAGES, type AppLanguage } from "@vet/shared";

const KEY = "vet.lang";

/** User-chosen language override (null = follow the device locale). */
export function getStoredLanguage(): AppLanguage | null {
  const v = prefs.getString(KEY);
  return v && (SUPPORTED_LANGUAGES as readonly string[]).includes(v) ? (v as AppLanguage) : null;
}

export function setStoredLanguage(lang: AppLanguage): void {
  prefs.set(KEY, lang);
}
