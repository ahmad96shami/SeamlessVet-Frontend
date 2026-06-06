import axios from "axios";
import { createApiClient, type AuthTokens, type TokenProvider } from "@vet/shared";

import { API_BASE_URL } from "@/lib/config";
import { tokenStorage } from "@/services/tokenStorage";

// Bare instance for the refresh call itself — no interceptors, so a 401 here
// can't recurse into the refresh loop.
const refreshClient = axios.create({ baseURL: API_BASE_URL });

let onAuthError: (() => void) | undefined;
/** Registered at app bootstrap so a failed refresh can flip the auth store to logged-out. */
export function setOnAuthError(handler: () => void): void {
  onAuthError = handler;
}

let onRefreshSuccess: (() => void) | undefined;
/**
 * Registered at app bootstrap so a *successful* token refresh can clear the read-only
 * "session expired" flag (Mo6.5): the access token expired (offline or just lapsed), but the
 * refresh token was still valid, so the session is live again and queued writes can resume.
 */
export function setOnRefreshSuccess(handler: () => void): void {
  onRefreshSuccess = handler;
}

const tokenProvider: TokenProvider = {
  async getAccessToken() {
    return (await tokenStorage.getTokens())?.accessToken ?? null;
  },
  async refresh() {
    const refreshToken = (await tokenStorage.getTokens())?.refreshToken;
    if (!refreshToken) return null;
    try {
      const { data } = await refreshClient.post("/auth/refresh", { refreshToken });
      const next: AuthTokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
      await tokenStorage.setTokens(next);
      onRefreshSuccess?.();
      return next;
    } catch {
      return null;
    }
  },
  onAuthError() {
    void tokenStorage.clear();
    onAuthError?.();
  },
};

/** The app-wide Axios client: Authorization + idempotency + 401→refresh→retry (from @vet/shared). */
export const apiClient = createApiClient({ baseURL: API_BASE_URL, tokenProvider });

/**
 * Cheap authed round-trip to self-heal a lapsed access token while the server is reachable:
 * the 401 → single-flight refresh → retry pipeline rotates the pair and `onRefreshSuccess`
 * clears the read-only banner. Offline it fails at the network layer (no 401), so nothing
 * changes and the banner stays. `POST /auth/powersync-token` is the cheapest authed endpoint:
 * idempotency-exempt (auth/*) and side-effect-free (mints a short-lived stream JWT).
 *
 * Without this, a foregrounded app whose reads are all local SQLite never fires a REST call,
 * so nothing drives the refresh and the "session expired" banner sticks until cold start.
 */
export function pokeSession(): void {
  void apiClient.post("/auth/powersync-token").catch(() => {
    /* offline / unreachable — a later poke or the PowerSync reconnect heals it */
  });
}
