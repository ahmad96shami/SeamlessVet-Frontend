import { drainQueue } from "@vet/shared";

import { apiClient } from "@/services/apiClient";
import { offlineQueue } from "@/services/offlineQueue";
import { useSyncStore } from "@/stores/syncStore";

/**
 * The offline write-queue's replay driver. Drains the queue through the API on reconnect and on
 * demand, with one drain at a time, exponential backoff for transient failures, and live counts
 * pushed to {@link useSyncStore}. Conflicts (server rejections) are parked by `drainQueue` and
 * surfaced in the review panel — never retried automatically, never silently dropped.
 */

const BACKOFF_BASE = 2000;
const BACKOFF_MAX = 60_000;

let draining = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let backoff = 0;

const isOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine);

function clearRetry(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleBackoffRetry(): void {
  backoff = Math.min(backoff ? backoff * 2 : BACKOFF_BASE, BACKOFF_MAX);
  clearRetry();
  retryTimer = setTimeout(() => void syncNow(), backoff);
}

/** Refresh the queue counts in the store (cheap; called after every state change). */
export async function refreshSyncCounts(): Promise<void> {
  const [pendingCount, conflictCount] = await Promise.all([
    offlineQueue.count(),
    offlineQueue.conflictCount(),
  ]);
  useSyncStore.getState().set({ pendingCount, conflictCount });
}

/**
 * Drain the queue now (no-op if already draining or offline). Replays oldest-first in batches
 * until nothing's left, no progress is made, or we drop offline. A transient stop while still
 * online schedules a backoff retry; progress resets the backoff.
 */
export async function syncNow(): Promise<void> {
  if (draining || !isOnline()) {
    await refreshSyncCounts();
    return;
  }

  draining = true;
  useSyncStore.getState().set({ syncing: true });
  try {
    for (;;) {
      const replayable = await offlineQueue.replayable();
      if (replayable.length === 0 || !isOnline()) break;

      const result = await drainQueue(offlineQueue, apiClient);
      await refreshSyncCounts();

      if (result.completed === 0) {
        // No progress: a transient stop (retry later) or only conflicts remain (left for the user).
        if (result.retryable > 0 && isOnline()) scheduleBackoffRetry();
        break;
      }
      backoff = 0; // progress → reset backoff
    }
  } finally {
    draining = false;
    useSyncStore.getState().set({ syncing: false });
  }
}

/**
 * Re-point the sync engine at the active center's DB after an env switch (W24): cancel any pending
 * backoff, recount the (now different) queue, and flush if online. The offline queue itself follows
 * the DB lazily via `getDb()`; this just refreshes the badge + kicks a drain for the new tenant.
 */
export async function resetSyncForEnv(): Promise<void> {
  clearRetry();
  backoff = 0;
  await refreshSyncCounts();
  if (isOnline()) void syncNow();
}

/** Call after enqueuing a write — refresh the badge and, if online, try to flush immediately. */
export async function notifyEnqueued(): Promise<void> {
  await refreshSyncCounts();
  if (isOnline()) void syncNow();
}

/** Re-arm a failed/conflict item and drain (the panel's per-item "retry"). */
export async function retryItem(id: string): Promise<void> {
  await offlineQueue.retry(id);
  await refreshSyncCounts();
  void syncNow();
}

/** Re-arm every conflict and drain (the panel's "retry all"). */
export async function retryAll(): Promise<void> {
  const items = await offlineQueue.all();
  await Promise.all(items.filter((r) => r.status === "conflict").map((r) => offlineQueue.retry(r.id)));
  await refreshSyncCounts();
  void syncNow();
}

/** Discard one queued item (the panel's "discard", behind a confirm). */
export async function discardItem(id: string): Promise<void> {
  await offlineQueue.remove(id);
  await refreshSyncCounts();
}

/** Wire connectivity listeners + flush anything left from a prior session. Returns a teardown. */
export function startSyncEngine(): () => void {
  const onOnline = (): void => {
    useSyncStore.getState().set({ online: true });
    clearRetry();
    backoff = 0;
    void syncNow();
  };
  const onOffline = (): void => {
    useSyncStore.getState().set({ online: false });
    clearRetry();
  };

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  useSyncStore.getState().set({ online: isOnline() });
  void refreshSyncCounts();
  if (isOnline()) void syncNow();

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    clearRetry();
  };
}
