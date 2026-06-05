import { create } from "zustand";
import type { LoginResponse } from "@vet/shared";

import { logout as logoutApi } from "@/api/auth";
import { decodeJwt } from "@/lib/jwt";
import { setOnAuthError, setOnRefreshSuccess } from "@/services/apiClient";
import {
  resumePushTokenRegistration,
  suspendPushTokenRegistration,
  unregisterPushTokenBestEffort,
} from "@/services/localNotifications";
import { prefs } from "@/services/mmkv";
import { tokenStorage } from "@/services/tokenStorage";
import { useSyncStore } from "@/stores/syncStore";
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
  /**
   * Display name for the greeting / حسابي profile header (MoD). Sourced from the
   * LoginResponse (the JWT carries no name claim) and cached in MMKV exactly like
   * {@link numberPrefix} so a cold start shows the name without a network round-trip.
   */
  fullName: string | null;
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /**
   * Read-only mode (PRD §8.8): the access token has expired and we can't refresh yet (offline).
   * Reads from local SQLite keep working and writes keep queuing; a successful refresh or re-login
   * clears it. Distinct from `unauthenticated` — the session isn't *gone*, just stale.
   */
  sessionExpired: boolean;
  setSessionFromLogin: (res: LoginResponse) => Promise<void>;
  restore: () => Promise<void>;
  logout: () => Promise<void>;
  handleAuthError: () => void;
  /** Recompute {@link sessionExpired} from the stored access token's `exp` (foreground / refresh). */
  refreshSessionState: () => Promise<void>;
}

const NUMBER_PREFIX_KEY = "auth.numberPrefix";
const FULL_NAME_KEY = "auth.fullName";

/** True when the access token's `exp` is in the past (UX-only — the server is authoritative). */
function isAccessTokenExpired(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  const exp = decodeJwt(accessToken)?.exp;
  return typeof exp === "number" ? exp * 1000 <= Date.now() : false;
}

function userFromAccessToken(
  accessToken: string,
  fallback?: { role?: string; numberPrefix?: string | null; fullName?: string | null },
): AuthUser | null {
  const claims = decodeJwt(accessToken);
  if (!claims?.sub) return null;
  return {
    userId: claims.sub,
    role: claims.role ?? fallback?.role ?? "",
    environmentId: claims.environment_id ?? "",
    numberPrefix: fallback?.numberPrefix ?? null,
    fullName: fallback?.fullName ?? null,
  };
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: "unknown",
  user: null,
  sessionExpired: false,

  setSessionFromLogin: async (res) => {
    resumePushTokenRegistration(); // Mo10 — lift the logout suspension for the new session.
    await tokenStorage.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    // Cache the prefix in MMKV so a cold start (before /auth/refresh runs) still
    // has it for client-side visit-number minting.
    if (res.numberPrefix) prefs.set(NUMBER_PREFIX_KEY, res.numberPrefix);
    else prefs.remove(NUMBER_PREFIX_KEY);
    if (res.fullName) prefs.set(FULL_NAME_KEY, res.fullName);
    else prefs.remove(FULL_NAME_KEY);
    set({
      status: "authenticated",
      sessionExpired: false,
      user: userFromAccessToken(res.accessToken, {
        role: res.roleKey,
        numberPrefix: res.numberPrefix ?? null,
        fullName: res.fullName ?? null,
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
    const fullName = prefs.getString(FULL_NAME_KEY) ?? null;
    const user = tokens?.accessToken
      ? userFromAccessToken(tokens.accessToken, { numberPrefix, fullName })
      : null;
    // An expired access token is fine here — the first request's 401 triggers refresh-or-logout.
    // Surface read-only mode up front if the cached token is already past `exp` (e.g. the app was
    // closed for a while); a reconnect + refresh clears it.
    set(
      user
        ? { status: "authenticated", user, sessionExpired: isAccessTokenExpired(tokens?.accessToken) }
        : { status: "unauthenticated", user: null, sessionExpired: false },
    );
    if (user) void connectPowerSync();
  },

  logout: async () => {
    // Mo10: drop this device's push token while the bearer is still valid — best-effort, swallowed
    // inside, never blocks the local-first logout below. Registration is suspended FIRST so a
    // token-listener mint chain resolving mid-logout can't re-register the row we just deleted
    // (live-smoke race); the next sign-in/restore resumes it.
    suspendPushTokenRegistration();
    await unregisterPushTokenBestEffort();
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
    prefs.remove(FULL_NAME_KEY);
    set({ status: "unauthenticated", user: null, sessionExpired: false });
  },

  handleAuthError: () => {
    // PRD §8.8: a failed refresh while **offline** is token expiry, not a dead session — stay
    // signed in in read-only mode, keep the local DB + queued writes, and let a reconnect refresh
    // (or re-login) resume. Only a refresh that definitively fails while **online** (revoked /
    // expired refresh token, server reachable) is a real logout → wipe.
    if (!useSyncStore.getState().online) {
      set({ sessionExpired: true });
      return;
    }
    void disconnectAndWipePowerSync();
    set({ status: "unauthenticated", user: null, sessionExpired: false });
  },

  refreshSessionState: async () => {
    const tokens = await tokenStorage.getTokens();
    set(
      get().status === "authenticated"
        ? { sessionExpired: isAccessTokenExpired(tokens?.accessToken) }
        : { sessionExpired: false },
    );
  },
}));

// A successful token refresh means the session is live again — clear read-only mode (Mo6.5).
setOnRefreshSuccess(() => {
  void useAuthStore.getState().refreshSessionState();
});

// Wire the apiClient's onAuthError to the store so a failed refresh logs out.
setOnAuthError(() => useAuthStore.getState().handleAuthError());
