import { create } from "zustand";

/** A coarse, derived state for the shell indicator. */
export type SyncStatus = "offline" | "syncing" | "conflict" | "online";

export interface SyncSnapshot {
  /** Browser connectivity (navigator.onLine + online/offline events). */
  online: boolean;
  /** A drain is currently in flight. */
  syncing: boolean;
  /** Total unsynced items in the queue (pending + failed + conflict). */
  pendingCount: number;
  /** Items the server rejected, awaiting manual resolution. */
  conflictCount: number;
}

interface SyncStore extends SyncSnapshot {
  set: (patch: Partial<SyncSnapshot>) => void;
}

/** Single source of truth for sync state — written by the sync engine, read by the shell + panel. */
export const useSyncStore = create<SyncStore>((set) => ({
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  syncing: false,
  pendingCount: 0,
  conflictCount: 0,
  set: (patch) => set(patch),
}));

/** Priority: offline (can't sync) → syncing → conflict (needs action) → online. */
export function deriveStatus(s: SyncSnapshot): SyncStatus {
  if (!s.online) return "offline";
  if (s.syncing) return "syncing";
  if (s.conflictCount > 0) return "conflict";
  return "online";
}
