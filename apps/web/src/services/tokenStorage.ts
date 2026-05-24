import type { AuthTokens, TokenStorage } from "@vet/shared";

const STORAGE_KEY = "vet.tokens";

/**
 * Browser implementation of the shared {@link TokenStorage} adapter.
 *
 * W0 persists tokens in localStorage so a reload restores the session (refresh-on-load).
 * TECH_STACK's preferred long-term model is access-in-memory + refresh via an httpOnly
 * cookie behind an SSR proxy; that swap is local to this file when the proxy lands.
 */
class BrowserTokenStorage implements TokenStorage {
  getTokens(): AuthTokens | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthTokens) : null;
    } catch {
      return null;
    }
  }

  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const tokenStorage = new BrowserTokenStorage();
