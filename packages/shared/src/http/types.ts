export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /**
   * ISO-8601 expiry of the refresh token (login/refresh responses carry it). Lets a client
   * decide at boot that the session is unrecoverable — straight to login, no doomed network
   * round-trip. Optional: tokens persisted before this field existed simply fall back to the
   * 401 → refresh → onAuthError path.
   */
  refreshTokenExpiresAt?: string;
}

/**
 * Persists auth tokens. Implemented per app (the platform-specific bit):
 *   - web: in-memory + refresh-on-load (httpOnly cookie if a proxy is added)
 *   - mobile: expo-secure-store
 * Methods may be sync or async.
 */
export interface TokenStorage {
  getTokens(): Promise<AuthTokens | null> | AuthTokens | null;
  setTokens(tokens: AuthTokens): Promise<void> | void;
  clear(): Promise<void> | void;
}

/**
 * Supplies the API client with the current access token and a refresh routine.
 * The client calls `getAccessToken()` per request and `refresh()` once on a 401.
 */
export interface TokenProvider {
  getAccessToken(): Promise<string | null> | string | null;
  /** Rotate tokens; return the new pair, or null if refresh failed (→ force logout). */
  refresh(): Promise<AuthTokens | null>;
  /** Called when refresh fails — the app should wipe local state + route to login. */
  onAuthError?(): void;
}
