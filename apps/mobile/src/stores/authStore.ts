import { create } from "zustand";
import type { LoginResponse } from "@vet/shared";

import { logout as logoutApi } from "@/api/auth";
import { decodeJwt } from "@/lib/jwt";
import { setOnAuthError } from "@/services/apiClient";
import { tokenStorage } from "@/services/tokenStorage";

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

export interface AuthUser {
  userId: string;
  role: string;
  environmentId: string;
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  setSessionFromLogin: (res: LoginResponse) => Promise<void>;
  restore: () => Promise<void>;
  logout: () => Promise<void>;
  handleAuthError: () => void;
}

function userFromAccessToken(accessToken: string, fallbackRole?: string): AuthUser | null {
  const claims = decodeJwt(accessToken);
  if (!claims?.sub) return null;
  return {
    userId: claims.sub,
    role: claims.role ?? fallbackRole ?? "",
    environmentId: claims.environment_id ?? "",
  };
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: "unknown",
  user: null,

  setSessionFromLogin: async (res) => {
    await tokenStorage.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    set({ status: "authenticated", user: userFromAccessToken(res.accessToken, res.roleKey) });
  },

  restore: async () => {
    const tokens = await tokenStorage.getTokens();
    const user = tokens?.accessToken ? userFromAccessToken(tokens.accessToken) : null;
    // An expired access token is fine here — the first request's 401 triggers refresh-or-logout.
    set(user ? { status: "authenticated", user } : { status: "unauthenticated", user: null });
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
    await tokenStorage.clear();
    set({ status: "unauthenticated", user: null });
  },

  handleAuthError: () => set({ status: "unauthenticated", user: null }),
}));

// Wire the apiClient's onAuthError to the store so a failed refresh logs out.
setOnAuthError(() => useAuthStore.getState().handleAuthError());
