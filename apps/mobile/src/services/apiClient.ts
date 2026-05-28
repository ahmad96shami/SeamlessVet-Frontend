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
