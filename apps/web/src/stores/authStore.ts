import { create } from "zustand";
import type { LoginResponse } from "@vet/shared";

import { logout as logoutApi } from "@/api/auth";
import { decodeJwt } from "@/lib/jwt";
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
  /**
   * Set when a session ends involuntarily (failed refresh / expired at boot) so the login
   * page can explain why; consumed (one-shot) by {@link consumeSessionExpired}. The toast is
   * fired from LoginPage, not here — at boot this store runs inside App's mount effect, where
   * StrictMode's unmount/remount of <Toaster> can swallow a toast fired straight from the store.
   */
  sessionExpired: boolean;
  setSessionFromLogin: (res: LoginResponse) => void;
  restore: () => void;
  logout: () => void;
  handleAuthError: () => void;
  consumeSessionExpired: () => boolean;
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

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: "unknown",
  user: null,
  sessionExpired: false,

  setSessionFromLogin: (res) => {
    tokenStorage.setTokens({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      refreshTokenExpiresAt: res.refreshTokenExpiresAt,
    });
    set({ status: "authenticated", user: userFromAccessToken(res.accessToken, res.roleKey) });
  },

  restore: () => {
    const tokens = tokenStorage.getTokens();
    if (!tokens?.accessToken) {
      set({ status: "unauthenticated", user: null });
      return;
    }
    // A refresh token past its server-side expiry can never be rotated — don't render the
    // shell just to watch every query 401; go straight to login with the expired notice.
    if (tokens.refreshTokenExpiresAt && Date.parse(tokens.refreshTokenExpiresAt) <= Date.now()) {
      get().handleAuthError();
      return;
    }
    const user = userFromAccessToken(tokens.accessToken);
    // An expired access token is fine here — the first call's 401 triggers refresh-or-logout.
    set(user ? { status: "authenticated", user } : { status: "unauthenticated", user: null });
  },

  // Local-first: the sign-out button must always work (offline, slow server, anything) —
  // clear local state now, revoke the refresh token server-side in the background.
  logout: () => {
    const refreshToken = tokenStorage.getTokens()?.refreshToken;
    tokenStorage.clear();
    set({ status: "unauthenticated", user: null });
    if (refreshToken) {
      void logoutApi({ refreshToken }).catch(() => {
        /* best-effort server revoke */
      });
    }
  },

  // Session is unrecoverable (failed refresh / expired at boot): wipe tokens and route to
  // login. Voluntary sign-out doesn't set the flag — only a session that ENDED ON ITS OWN.
  handleAuthError: () => {
    tokenStorage.clear();
    const hadSession = get().status !== "unauthenticated";
    set({ status: "unauthenticated", user: null, sessionExpired: hadSession });
  },

  consumeSessionExpired: () => {
    const expired = get().sessionExpired;
    if (expired) set({ sessionExpired: false });
    return expired;
  },
}));
