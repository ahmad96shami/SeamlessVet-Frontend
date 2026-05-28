import { I18nManager } from "react-native";
import * as Updates from "expo-updates";

/**
 * Arabic-first / RTL is non-negotiable for the Field Mobile App (PRD §8.1).
 * `I18nManager.forceRTL(true)` only takes effect after a fresh JS context, so on
 * the first launch (when `isRTL` is still false) we flip the flag and reload
 * the app once. Subsequent launches see `isRTL === true` and skip the work.
 *
 * Open-decision pick (MOBILE.md § Open decisions): auto-reload via expo-updates
 * over a "restart to apply" prompt — the user sees one quick flash and the app
 * comes back RTL-laid-out, with no manual restart step.
 *
 * Returns true if a reload was triggered (the caller should bail out of render).
 */
export async function ensureArabicRTL(): Promise<boolean> {
  if (I18nManager.isRTL) return false;
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  await Updates.reloadAsync();
  return true;
}
