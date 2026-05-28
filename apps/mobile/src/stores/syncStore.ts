import { create } from "zustand";

/** A coarse, derived state used by the shell indicator + offline banner. */
export type SyncStatus = "offline" | "syncing" | "conflict" | "online";

export interface SyncSnapshot {
  /** PowerSync's stream connection — used here as the network-online proxy on mobile. */
  online: boolean;
  /** A REST-queue drain is currently in flight. */
  syncing: boolean;
  /** Total unsynced REST-intent items in the queue (pending + failed + conflict). */
  pendingCount: number;
  /** Items the server rejected, awaiting manual resolution (Mo6). */
  conflictCount: number;
}

interface SyncStore extends SyncSnapshot {
  set: (patch: Partial<SyncSnapshot>) => void;
}

/**
 * Single source of truth for the mobile REST-queue sync state — written by the sync engine,
 * read by the shell indicator and (Mo6) the conflict-review panel. `online` is initialised
 * pessimistically to `false`; the engine flips it to `true` once PowerSync's first
 * `statusChanged` callback lands with `connected: true`.
 */
export const useSyncStore = create<SyncStore>((set) => ({
  online: false,
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
