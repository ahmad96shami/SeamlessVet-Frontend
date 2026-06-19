import { create } from "zustand";
import type { AuthErrorReason, LoginResponse } from "@vet/shared";

import { logout as logoutApi } from "@/api/auth";
import i18n from "@/i18n";
import { decodeJwt } from "@/lib/jwt";
import { pokeSession, setOnAuthError, setOnRefreshSuccess } from "@/services/apiClient";
import {
  resumePushTokenRegistration,
  suspendPushTokenRegistration,
  unregisterPushTokenBestEffort,
} from "@/services/localNotifications";
import { prefs } from "@/services/mmkv";
import { setQueueEnvironment } from "@/services/offlineQueue";
import { tokenStorage } from "@/services/tokenStorage";
import { dialog } from "@/stores/dialogStore";
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
  /**
   * The active center's display label (the field header + profile, Mo13). Sourced from the center
   * the doctor picked at login — the JWT carries only `environment_id`, never a name — and cached in
   * MMKV exactly like {@link fullName} so a cold start / restore shows it without a round-trip. A
   * mobile device only ever holds one session at a time, so a single cached name always matches the
   * restored env. Null until a session is established / if the name is unknown.
   */
  centerName: string | null;
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
  setSessionFromLogin: (res: LoginResponse, centerName?: string) => Promise<void>;
  restore: () => Promise<void>;
  logout: () => Promise<void>;
  handleAuthError: (reason?: AuthErrorReason) => void;
  /** Recompute {@link sessionExpired} from the stored access token's `exp` (foreground / refresh). */
  refreshSessionState: () => Promise<void>;
}

const NUMBER_PREFIX_KEY = "auth.numberPrefix";
const FULL_NAME_KEY = "auth.fullName";
const CENTER_NAME_KEY = "auth.centerName";

/** True when the access token's `exp` is in the past (UX-only — the server is authoritative). */
function isAccessTokenExpired(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  const exp = decodeJwt(accessToken)?.exp;
  return typeof exp === "number" ? exp * 1000 <= Date.now() : false;
}

function userFromAccessToken(
  accessToken: string,
  fallback?: {
    role?: string;
    numberPrefix?: string | null;
    fullName?: string | null;
    centerName?: string | null;
  },
): AuthUser | null {
  const claims = decodeJwt(accessToken);
  if (!claims?.sub) return null;
  return {
    userId: claims.sub,
    role: claims.role ?? fallback?.role ?? "",
    environmentId: claims.environment_id ?? "",
    numberPrefix: fallback?.numberPrefix ?? null,
    fullName: fallback?.fullName ?? null,
    centerName: fallback?.centerName ?? null,
  };
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: "unknown",
  user: null,
  sessionExpired: false,

  setSessionFromLogin: async (res, centerName) => {
    resumePushTokenRegistration(); // Mo10 — lift the logout suspension for the new session.
    await tokenStorage.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    // Cache the prefix in MMKV so a cold start (before /auth/refresh runs) still
    // has it for client-side visit-number minting.
    if (res.numberPrefix) prefs.set(NUMBER_PREFIX_KEY, res.numberPrefix);
    else prefs.remove(NUMBER_PREFIX_KEY);
    if (res.fullName) prefs.set(FULL_NAME_KEY, res.fullName);
    else prefs.remove(FULL_NAME_KEY);
    // Cache the picked center's name (Mo13) for the header on a cold start — the JWT has no name.
    if (centerName) prefs.set(CENTER_NAME_KEY, centerName);
    else prefs.remove(CENTER_NAME_KEY);
    const user = userFromAccessToken(res.accessToken, {
      role: res.roleKey,
      numberPrefix: res.numberPrefix ?? null,
      fullName: res.fullName ?? null,
      centerName: centerName ?? null,
    });
    // Point the offline REST queue at this center's slot BEFORE PowerSync connects + the engine
    // drains (Mo13) — so a center switch never replays the previous center's queued writes.
    setQueueEnvironment(user?.environmentId ?? null);
    set({ status: "authenticated", sessionExpired: false, user });
    // Fire-and-forget: PowerSync connects in the background; the UI is not blocked on the
    // first sync. The SDK's `fetchCredentials` failure path also tolerates being called
    // before the access token refresh interceptor has settled.
    void connectPowerSync();
  },

  restore: async () => {
    const tokens = await tokenStorage.getTokens();
    const numberPrefix = prefs.getString(NUMBER_PREFIX_KEY) ?? null;
    const fullName = prefs.getString(FULL_NAME_KEY) ?? null;
    const centerName = prefs.getString(CENTER_NAME_KEY) ?? null;
    const user = tokens?.accessToken
      ? userFromAccessToken(tokens.accessToken, { numberPrefix, fullName, centerName })
      : null;
    // Re-point the offline queue at the restored session's center (Mo13) before the engine drains.
    setQueueEnvironment(user?.environmentId ?? null);
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
    prefs.remove(CENTER_NAME_KEY);
    // Unpoint the queue (Mo13) — a center SWITCH then reads the next center's own (empty) slot.
    // Items already parked under this center's key stay there for a same-center re-login (don't
    // lose a queued field sale on a manual sign-out); a different center never sees them.
    setQueueEnvironment(null);
    set({ status: "unauthenticated", user: null, sessionExpired: false });
  },

  handleAuthError: (reason) => {
    // The center was suspended mid-session (Mo13 — a global 403 `environment_suspended`). A
    // suspended env can't be recovered by a refresh, and a 403 only arrives while ONLINE, so this
    // is always a hard logout (never read-only): wipe the local DB, drop to login, and explain why.
    // On-device data stays only if the env is later reactivated and the doctor signs back in.
    if (reason === "suspended") {
      void disconnectAndWipePowerSync();
      prefs.remove(NUMBER_PREFIX_KEY);
      prefs.remove(FULL_NAME_KEY);
      prefs.remove(CENTER_NAME_KEY);
      setQueueEnvironment(null);
      set({ status: "unauthenticated", user: null, sessionExpired: false });
      void dialog.alert(i18n.t("auth.login.title"), i18n.t("auth.session.suspendedToast"));
      return;
    }
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
    const expired =
      get().status === "authenticated" && isAccessTokenExpired(tokens?.accessToken);
    set({ sessionExpired: expired });
    // Self-heal: with all reads local, nothing else fires a REST call after a
    // foreground — poke one authed request so 401→refresh rotates the pair and
    // clears the banner (no-op while offline; see pokeSession).
    if (expired) pokeSession();
  },
}));

// A successful token refresh means the session is live again — clear read-only mode (Mo6.5).
setOnRefreshSuccess(() => {
  void useAuthStore.getState().refreshSessionState();
});

// Wire the apiClient's onAuthError to the store so a failed refresh logs out — passing the reason
// (Mo13) so a suspended center (403) forces logout + notice, distinct from a plain expiry.
setOnAuthError((reason) => useAuthStore.getState().handleAuthError(reason));
