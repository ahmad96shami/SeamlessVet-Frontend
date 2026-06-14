import type { PlatformAuthResponse } from "@vet/shared";

/**
 * The platform super-admin session (W25), stored entirely apart from the tenant token
 * ({@link ./tokenStorage}). Distinct storage key + a distinct Axios client ({@link ./platformApiClient})
 * is the whole point: a tenant token must never reach `/platform/*` and a platform token must never
 * reach a tenant endpoint. There is no refresh token in v1 — an expired platform token means re-login.
 */
const STORAGE_KEY = "vet.platform.tokens";

/** What the platform client needs (`accessToken`) plus what the console header shows (`fullName`). */
export type PlatformSession = PlatformAuthResponse;

class PlatformTokenStorage {
  get(): PlatformSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PlatformSession) : null;
    } catch {
      return null;
    }
  }

  set(session: PlatformSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const platformTokenStorage = new PlatformTokenStorage();
