import { create } from "zustand";
import type { LoginResponse } from "@vet/shared";

import { logout as logoutApi } from "@/api/auth";
import { decodeJwt } from "@/lib/jwt";
import { centerNameFor } from "@/services/centerMemory";
import { enterEnvironment, exitEnvironment } from "@/services/tenant";
import { tokenStorage } from "@/services/tokenStorage";

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

/** Why a session ended on its own — drives the notice the login page shows. */
export type SessionEndedReason = "expired" | "suspended";

export interface AuthUser {
  userId: string;
  role: string;
  environmentId: string;
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /**
   * The active center's display name (the shell header label). Sourced from the center the user
   * picked at login — the JWT carries only `environment_id` — and recovered from
   * {@link centerNameFor} on restore. Null until a session is established / if the name is unknown.
   */
  centerName: string | null;
  /**
   * Set when a session ends involuntarily so the login page can explain why; consumed (one-shot)
   * by {@link consumeEndedReason}. `expired` = failed refresh / expired at boot; `suspended` = the
   * center was suspended (a global 403 `environment_suspended`). The notice fires from LoginPage,
   * not here — at boot this store runs inside App's mount effect, where StrictMode's
   * unmount/remount of <Toaster> can swallow a toast fired straight from the store.
   */
  endedReason: SessionEndedReason | null;
  setSessionFromLogin: (res: LoginResponse, centerName?: string) => void;
  restore: () => void;
  logout: () => void;
  handleAuthError: () => void;
  handleEnvironmentSuspended: () => void;
  consumeEndedReason: () => SessionEndedReason | null;
}

/**
 * Build the state patch for an involuntary session end. Idempotent under concurrent calls: only a
 * session that was still alive sets a reason, and a reason already pending (not yet shown on the
 * login page) is preserved — several queries failing at once (e.g. the non-single-flight 403
 * `environment_suspended`) must not clobber the notice back to null.
 */
function endSession(reason: SessionEndedReason) {
  return (s: AuthState): Partial<AuthState> => ({
    status: "unauthenticated",
    user: null,
    centerName: null,
    endedReason: s.endedReason ?? (s.status !== "unauthenticated" ? reason : null),
  });
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
  centerName: null,
  endedReason: null,

  setSessionFromLogin: (res, centerName) => {
    tokenStorage.setTokens({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      refreshTokenExpiresAt: res.refreshTokenExpiresAt,
    });
    const user = userFromAccessToken(res.accessToken, res.roleKey);
    // Switch local storage to this center's DB before flipping authenticated, so the shell's first
    // queries read the right tenant's cache (and a fresh login drops any pre-login in-memory cache).
    if (user) enterEnvironment(user.environmentId);
    set({
      status: "authenticated",
      user,
      centerName: centerName ?? (user ? centerNameFor(user.environmentId) : null),
    });
  },

  restore: () => {
    const tokens = tokenStorage.getTokens();
    if (!tokens?.accessToken) {
      set({ status: "unauthenticated", user: null, centerName: null });
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
    // Same-env restore is a no-op that preserves the cache the persister hydrated from this DB.
    if (user) enterEnvironment(user.environmentId);
    set(
      user
        ? { status: "authenticated", user, centerName: centerNameFor(user.environmentId) }
        : { status: "unauthenticated", user: null, centerName: null },
    );
  },

  // Local-first: the sign-out button must always work (offline, slow server, anything) —
  // clear local state now, revoke the refresh token server-side in the background.
  logout: () => {
    const refreshToken = tokenStorage.getTokens()?.refreshToken;
    tokenStorage.clear();
    // Manual sign-out wipes this center's local DB so nothing lingers on a shared browser (W24).
    void exitEnvironment();
    set({ status: "unauthenticated", user: null, centerName: null });
    if (refreshToken) {
      void logoutApi({ refreshToken }).catch(() => {
        /* best-effort server revoke */
      });
    }
  },

  // Session is unrecoverable (failed refresh / expired at boot): wipe tokens and route to
  // login. Voluntary sign-out doesn't set a reason — only a session that ENDED ON ITS OWN.
  handleAuthError: () => {
    tokenStorage.clear();
    set(endSession("expired"));
  },

  // The center was suspended mid-session (a global 403 `environment_suspended`): force logout
  // with a distinct notice. Data stays on the device (the env is suspended, not gone).
  handleEnvironmentSuspended: () => {
    tokenStorage.clear();
    set(endSession("suspended"));
  },

  consumeEndedReason: () => {
    const reason = get().endedReason;
    if (reason) set({ endedReason: null });
    return reason;
  },
}));
