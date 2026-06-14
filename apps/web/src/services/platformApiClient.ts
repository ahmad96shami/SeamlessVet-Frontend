import { createApiClient, type TokenProvider } from "@vet/shared";

import { API_BASE_URL } from "@/lib/config";
import { platformTokenStorage } from "@/services/platformTokenStorage";

/**
 * The platform super-admin's dedicated Axios client (W25) — fully separate from the tenant
 * {@link ./apiClient}. It reads the platform token from {@link platformTokenStorage} (never the tenant
 * token), so the two realms can never cross credentials. There is NO refresh in v1 (the backend mints
 * no platform refresh token): a 401 ends the session and routes back to platform login. `/platform/*`
 * carries no idempotency-key filter, so we exempt the whole prefix from the auto Idempotency-Key.
 */

let onAuthError: (() => void) | undefined;
/** Registered at app bootstrap so an expired platform token flips the platform store to logged-out. */
export function setPlatformOnAuthError(handler: () => void): void {
  onAuthError = handler;
}

const tokenProvider: TokenProvider = {
  getAccessToken: () => platformTokenStorage.get()?.accessToken ?? null,
  // No platform refresh token exists — fail the refresh so the 401 path triggers onAuthError.
  refresh: async () => null,
  onAuthError() {
    platformTokenStorage.clear();
    onAuthError?.();
  },
};

export const platformApiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenProvider,
  idempotencyExempt: [/^\/platform\//],
});
