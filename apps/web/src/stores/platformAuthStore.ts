import { create } from "zustand";
import type { PlatformAuthResponse } from "@vet/shared";

import { platformTokenStorage } from "@/services/platformTokenStorage";

export type PlatformAuthStatus = "unknown" | "authenticated" | "unauthenticated";

export interface PlatformAdmin {
  id: string;
  fullName: string;
}

interface PlatformAuthState {
  status: PlatformAuthStatus;
  admin: PlatformAdmin | null;
  setSession: (res: PlatformAuthResponse) => void;
  restore: () => void;
  logout: () => void;
  /** Token expired / rejected (a 401 with no recoverable refresh): drop the session, route to login. */
  handleAuthError: () => void;
}

/**
 * The platform super-admin session store (W25) — deliberately separate from {@link useAuthStore}.
 * No tenant concepts (no center, no offline DB, no suspended-center notice) and no refresh: the
 * platform realm is online-only and re-mints by login. `restore()` treats a token past its server
 * expiry as logged-out rather than rendering the console just to watch every call 401.
 */
export const usePlatformAuthStore = create<PlatformAuthState>()((set) => ({
  status: "unknown",
  admin: null,

  setSession: (res) => {
    platformTokenStorage.set(res);
    set({ status: "authenticated", admin: { id: res.platformAdminId, fullName: res.fullName } });
  },

  restore: () => {
    const session = platformTokenStorage.get();
    if (!session?.accessToken || Date.parse(session.accessTokenExpiresAt) <= Date.now()) {
      platformTokenStorage.clear();
      set({ status: "unauthenticated", admin: null });
      return;
    }
    set({
      status: "authenticated",
      admin: { id: session.platformAdminId, fullName: session.fullName },
    });
  },

  logout: () => {
    platformTokenStorage.clear();
    set({ status: "unauthenticated", admin: null });
  },

  handleAuthError: () => {
    platformTokenStorage.clear();
    set({ status: "unauthenticated", admin: null });
  },
}));
