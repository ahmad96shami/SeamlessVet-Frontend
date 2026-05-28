import Constants from "expo-constants";

/**
 * Base URL of the .NET backend. Resolved at runtime from the EAS profile's
 * `extra.apiUrl` (set per dev/staging/prod in eas.json — Mo0 task 7).
 *
 * Until EAS is wired (Mo0.7), local dev falls back to the LAN-routable Metro
 * host so the device can reach the host machine's backend. The exact value is
 * substituted by the developer (or by `adb reverse tcp:5180 tcp:5180` so
 * `http://localhost:5180` is forwarded over USB).
 */
const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };

export const API_BASE_URL: string = extra.apiUrl ?? "http://localhost:5180";
