import * as SecureStore from "expo-secure-store";
import type { AuthTokens, TokenStorage } from "@vet/shared";

const KEY = "vet.tokens";

/**
 * Mobile implementation of the shared {@link TokenStorage} adapter.
 *
 * expo-secure-store wraps the OS keystore (Keychain on iOS, Keystore-backed
 * EncryptedSharedPreferences on Android) — the right home for tokens on a
 * device that may be lost or shared. MMKV (Mo0.6) is reserved for
 * prefs/flags; never tokens.
 *
 * All ops are async — secure-store's sync APIs are web-only.
 */
class SecureStoreTokenStorage implements TokenStorage {
  async getTokens(): Promise<AuthTokens | null> {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      return raw ? (JSON.parse(raw) as AuthTokens) : null;
    } catch {
      return null;
    }
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY);
  }
}

export const tokenStorage = new SecureStoreTokenStorage();
