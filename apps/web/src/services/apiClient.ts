import axios from "axios";
import { createApiClient, type AuthErrorReason, type AuthTokens, type TokenProvider } from "@vet/shared";

import { API_BASE_URL } from "@/lib/config";
import { tokenStorage } from "@/services/tokenStorage";

// Bare instance for the refresh call itself — no interceptors, so a 401 here can't recurse.
const refreshClient = axios.create({ baseURL: API_BASE_URL });

let onAuthError: ((reason: AuthErrorReason) => void) | undefined;
/**
 * Registered at app bootstrap so an involuntary session end flips the auth store to logged-out.
 * `reason` distinguishes an expired/unrecoverable session from a suspended center (W24).
 */
export function setOnAuthError(handler: (reason: AuthErrorReason) => void): void {
  onAuthError = handler;
}

const tokenProvider: TokenProvider = {
  getAccessToken: () => tokenStorage.getTokens()?.accessToken ?? null,
  async refresh() {
    const refreshToken = tokenStorage.getTokens()?.refreshToken;
    if (!refreshToken) return null;
    try {
      const { data } = await refreshClient.post("/auth/refresh", { refreshToken });
      const next: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt,
      };
      tokenStorage.setTokens(next);
      return next;
    } catch {
      return null;
    }
  },
  onAuthError(reason) {
    tokenStorage.clear();
    onAuthError?.(reason);
  },
};

/** The app-wide Axios client: Authorization + idempotency + 401→refresh→retry (from @vet/shared). */
export const apiClient = createApiClient({ baseURL: API_BASE_URL, tokenProvider });
