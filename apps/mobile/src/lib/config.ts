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
const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  powersyncUrl?: string;
};

export const API_BASE_URL: string = extra.apiUrl ?? "http://localhost:5180";

/**
 * Base URL of the self-hosted PowerSync Service (the WebSocket sync endpoint).
 * Same per-profile resolution as {@link API_BASE_URL} — set via `extra.powersyncUrl`
 * from `eas.json`. Local dev hits the Docker-Compose'd service on `:8080`.
 */
export const POWERSYNC_BASE_URL: string = extra.powersyncUrl ?? "http://localhost:8080";
