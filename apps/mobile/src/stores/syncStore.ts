import { create } from "zustand";

/** A coarse, derived state used by the shell indicator + offline banner + review sheet. */
export type SyncStatus = "offline" | "syncing" | "conflict" | "online";

export interface SyncSnapshot {
  /** PowerSync's stream connection — used here as the network-online proxy on mobile. */
  online: boolean;
  /** A REST-queue drain is currently in flight. */
  syncing: boolean;
  /** Unsynced REST-intent items in the queue (pending + failed + conflict). */
  pendingCount: number;
  /** REST-intent items the server rejected, awaiting manual resolution. */
  conflictCount: number;
  /** PowerSync is draining its own CRUD upload queue right now (`dataFlowStatus.uploading`). */
  psUploading: boolean;
  /** Rows still queued in PowerSync's CRUD upload queue (`getUploadQueueStats().count`). */
  psPendingCount: number;
  /** PowerSync CRUD uploads the server rejected (server-wins) and we parked for review (Mo6.2). */
  psConflictCount: number;
}

interface SyncStore extends SyncSnapshot {
  set: (patch: Partial<SyncSnapshot>) => void;
}

/**
 * Single source of truth for the mobile sync state — written by the sync engine + the PowerSync
 * connector, read by the shell indicator and the Mo6 conflict-review sheet. It deliberately unifies
 * **both** upload paths of the hybrid write model: the shared REST-intent queue (`pendingCount` /
 * `conflictCount`) *and* PowerSync's own CRUD queue (`psPendingCount` / `psUploading` /
 * `psConflictCount`). `online` starts pessimistically `false`; the engine flips it `true` on
 * PowerSync's first `statusChanged` with `connected: true`.
 */
export const useSyncStore = create<SyncStore>((set) => ({
  online: false,
  syncing: false,
  pendingCount: 0,
  conflictCount: 0,
  psUploading: false,
  psPendingCount: 0,
  psConflictCount: 0,
  set: (patch) => set(patch),
}));

/** Total unsynced items across both upload paths — drives the indicator's pending badge. */
export function totalPending(s: SyncSnapshot): number {
  return s.pendingCount + s.psPendingCount;
}

/** Total parked rejections across both paths — drives the "needs attention" conflict state. */
export function totalConflicts(s: SyncSnapshot): number {
  return s.conflictCount + s.psConflictCount;
}

/** Priority: offline (can't sync) → syncing → conflict (needs action) → online. */
export function deriveStatus(s: SyncSnapshot): SyncStatus {
  if (!s.online) return "offline";
  if (s.syncing || s.psUploading) return "syncing";
  if (totalConflicts(s) > 0) return "conflict";
  return "online";
}
