import { create } from "zustand";
import type { LoginResponse } from "@vet/shared";

import { logout as logoutApi } from "@/api/auth";
import { decodeJwt } from "@/lib/jwt";
import { setOnAuthError } from "@/services/apiClient";
import { prefs } from "@/services/mmkv";
import { tokenStorage } from "@/services/tokenStorage";
import { connectPowerSync, disconnectAndWipePowerSync } from "@/sync/lifecycle";

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

export interface AuthUser {
  userId: string;
  role: string;
  environmentId: string;
  /**
   * Admin-assigned per-environment prefix used to mint `{prefix}-{seq}` visit
   * and invoice numbers client-side (Mo2 — visit_number for the field doctor's
   * offline visits). Null when the doctor has no prefix assigned yet (the
   * mobile UI surfaces an empty-state in that case and falls back to
   * leaving `visit_number` null, matching the web behaviour).
   *
   * Sourced from the LoginResponse and cached in MMKV so a cold start has it
   * before the next /auth/refresh round-trip — the JWT itself does not carry
   * the prefix (it's not used for authz).
   */
  numberPrefix: string | null;
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  setSessionFromLogin: (res: LoginResponse) => Promise<void>;
  restore: () => Promise<void>;
  logout: () => Promise<void>;
  handleAuthError: () => void;
}

const NUMBER_PREFIX_KEY = "auth.numberPrefix";

function userFromAccessToken(
  accessToken: string,
  fallback?: { role?: string; numberPrefix?: string | null },
): AuthUser | null {
  const claims = decodeJwt(accessToken);
  if (!claims?.sub) return null;
  return {
    userId: claims.sub,
    role: claims.role ?? fallback?.role ?? "",
    environmentId: claims.environment_id ?? "",
    numberPrefix: fallback?.numberPrefix ?? null,
  };
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: "unknown",
  user: null,

  setSessionFromLogin: async (res) => {
    await tokenStorage.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    // Cache the prefix in MMKV so a cold start (before /auth/refresh runs) still
    // has it for client-side visit-number minting.
    if (res.numberPrefix) prefs.set(NUMBER_PREFIX_KEY, res.numberPrefix);
    else prefs.remove(NUMBER_PREFIX_KEY);
    set({
      status: "authenticated",
      user: userFromAccessToken(res.accessToken, {
        role: res.roleKey,
        numberPrefix: res.numberPrefix ?? null,
      }),
    });
    // Fire-and-forget: PowerSync connects in the background; the UI is not blocked on the
    // first sync. The SDK's `fetchCredentials` failure path also tolerates being called
    // before the access token refresh interceptor has settled.
    void connectPowerSync();
  },

  restore: async () => {
    const tokens = await tokenStorage.getTokens();
    const numberPrefix = prefs.getString(NUMBER_PREFIX_KEY) ?? null;
    const user = tokens?.accessToken
      ? userFromAccessToken(tokens.accessToken, { numberPrefix })
      : null;
    // An expired access token is fine here — the first request's 401 triggers refresh-or-logout.
    set(user ? { status: "authenticated", user } : { status: "unauthenticated", user: null });
    if (user) void connectPowerSync();
  },

  logout: async () => {
    const refreshToken = (await tokenStorage.getTokens())?.refreshToken;
    if (refreshToken) {
      try {
        await logoutApi({ refreshToken });
      } catch {
        /* best-effort server revoke */
      }
    }
    // PRD §8.8: clear tokens AND wipe the local DB so the next signed-in user starts clean.
    // We wipe before flipping state so any in-flight UI subscription sees the empty rows.
    await disconnectAndWipePowerSync();
    await tokenStorage.clear();
    prefs.remove(NUMBER_PREFIX_KEY);
    set({ status: "unauthenticated", user: null });
  },

  handleAuthError: () => {
    void disconnectAndWipePowerSync();
    set({ status: "unauthenticated", user: null });
  },
}));

// Wire the apiClient's onAuthError to the store so a failed refresh logs out.
setOnAuthError(() => useAuthStore.getState().handleAuthError());
