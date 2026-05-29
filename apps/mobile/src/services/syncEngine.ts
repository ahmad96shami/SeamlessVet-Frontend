import { drainQueue } from "@vet/shared";

import { apiClient } from "@/services/apiClient";
import { offlineQueue } from "@/services/offlineQueue";
import { countPowerSyncConflicts, dismissPowerSyncConflict as dropPowerSyncConflict } from "@/services/powerSyncConflicts";
import { useSyncStore } from "@/stores/syncStore";
import { powerSync } from "@/sync/database";

/**
 * The mobile REST-queue's replay driver. Mirrors the web engine
 * (`apps/web/src/services/syncEngine.ts`) but uses **PowerSync's connection status**
 * as the network-online proxy: PowerSync's stream rides the same network the REST
 * queue does, so its `connected` flag is the most reliable online signal we have on
 * the device without adding `@react-native-community/netinfo` just for this.
 *
 * # Ordering caveat
 *
 * A field-invoice / exam-fee / receipt-voucher POST references a visit (and a customer
 * ledger) that lives in `/sync/{table}` writes. If we drain the REST queue *before*
 * PowerSync's CRUD queue has uploaded those rows, the server returns 4xx (visit not
 * found / not owned by this doctor) which `drainQueue` classifies as a *conflict* —
 * permanent rejection, surfaced to the user. That would be wrong: the row just hadn't
 * landed yet. So on every drain we first wait for PowerSync's upload queue to clear
 * (`getUploadQueueStats().count === 0`) before replaying REST intents.
 *
 * The wait is bounded — if PowerSync stalls for any reason we still attempt the REST
 * drain, and a real conflict surfaces normally. The bound is generous (15 s) because
 * the field doctor's first action after a long offline stretch is often "issue the
 * invoice", and we'd rather pay one wait than corrupt a sale.
 */

const BACKOFF_BASE = 2000;
const BACKOFF_MAX = 60_000;
const POWERSYNC_DRAIN_WAIT_MS = 15_000;
const POWERSYNC_POLL_MS = 250;

let draining = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let backoff = 0;

const isOnline = (): boolean => powerSync.currentStatus.connected;

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

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Block until PowerSync's CRUD upload queue is empty, or {@link POWERSYNC_DRAIN_WAIT_MS}
 * elapses. Returns whether the queue actually drained — callers don't currently branch
 * on this (we always try the REST drain regardless), but the bool is here for tests /
 * future telemetry.
 */
async function awaitPowerSyncDrained(): Promise<boolean> {
  const deadline = Date.now() + POWERSYNC_DRAIN_WAIT_MS;
  for (;;) {
    if (!isOnline()) return false;
    const stats = await powerSync.getUploadQueueStats(false);
    if (stats.count === 0) return true;
    if (Date.now() > deadline) return false;
    await sleep(POWERSYNC_POLL_MS);
  }
}

/**
 * Refresh the unified sync counts in the store (cheap; called after every state change). Reads
 * **both** upload paths so the indicator + review sheet stay in lockstep: the shared REST-intent
 * queue (`pendingCount` / `conflictCount`) and PowerSync's own CRUD upload queue (`psPendingCount`).
 * The PowerSync *conflict* count is owned by the connector's parked-rejection store and refreshed
 * by {@link refreshPowerSyncConflicts}.
 */
export async function refreshSyncCounts(): Promise<void> {
  const [pendingCount, conflictCount, psStats] = await Promise.all([
    offlineQueue.count(),
    offlineQueue.conflictCount(),
    powerSync.getUploadQueueStats(false).catch(() => ({ count: 0 })),
  ]);
  useSyncStore.getState().set({
    pendingCount,
    conflictCount,
    psPendingCount: psStats.count,
    psConflictCount: countPowerSyncConflicts(),
  });
}

/**
 * Drain the queue now (no-op if already draining or PowerSync isn't connected).
 * Replays oldest-first in batches until nothing's left, no progress is made, or we
 * drop offline. A transient stop while still online schedules a backoff retry;
 * progress resets the backoff.
 */
export async function syncNow(): Promise<void> {
  if (draining || !isOnline()) {
    await refreshSyncCounts();
    return;
  }

  draining = true;
  useSyncStore.getState().set({ syncing: true });
  try {
    // Ordering caveat: drain PowerSync's CRUD queue first so the rows our REST
    // intents reference (visits, ledgers) exist server-side.
    await awaitPowerSyncDrained();

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

/** Call after enqueuing a write — refresh the badge and, if online, try to flush immediately. */
export async function notifyEnqueued(): Promise<void> {
  await refreshSyncCounts();
  if (isOnline()) void syncNow();
}

/** Re-arm a failed/conflict item and drain (Mo6's per-item "retry"). */
export async function retryItem(id: string): Promise<void> {
  await offlineQueue.retry(id);
  await refreshSyncCounts();
  void syncNow();
}

/** Re-arm every conflict and drain (Mo6's "retry all"). */
export async function retryAll(): Promise<void> {
  const items = await offlineQueue.all();
  await Promise.all(items.filter((r) => r.status === "conflict").map((r) => offlineQueue.retry(r.id)));
  await refreshSyncCounts();
  void syncNow();
}

/** Discard one queued REST item (Mo6's "discard", behind a confirm). */
export async function discardItem(id: string): Promise<void> {
  await offlineQueue.remove(id);
  await refreshSyncCounts();
}

/**
 * Acknowledge one parked PowerSync server-wins rejection (Mo6.2's "dismiss"). Unlike a REST
 * conflict there's nothing to retry — the server already won and the op was discarded — so this
 * just clears it from the review sheet.
 */
export async function dismissPowerSyncConflict(id: string): Promise<void> {
  dropPowerSyncConflict(id);
  await refreshSyncCounts();
}

/**
 * Subscribe to PowerSync's status stream + flush anything left from a prior session.
 * Returns a teardown the root layout calls on unmount (rarely — the engine lives for
 * the app's lifetime in practice).
 */
export function startSyncEngine(): () => void {
  let wasOnline = isOnline();
  useSyncStore.getState().set({ online: wasOnline });
  void refreshSyncCounts();
  if (wasOnline) void syncNow();

  const dispose = powerSync.registerListener({
    statusChanged: (status) => {
      // Reflect PowerSync's *own* upload activity on every status change (it toggles without the
      // online flag changing), then refresh the queue counts so the indicator's pending badge
      // tracks the CRUD queue draining down. This is the "both PowerSync upload state and the
      // REST-queue state feed it" half of Mo6.1.
      useSyncStore.getState().set({ psUploading: status.dataFlowStatus?.uploading === true });
      void refreshSyncCounts();

      const nowOnline = status.connected === true;
      if (nowOnline === wasOnline) return;
      wasOnline = nowOnline;
      useSyncStore.getState().set({ online: nowOnline });
      if (nowOnline) {
        clearRetry();
        backoff = 0;
        void syncNow();
      } else {
        clearRetry();
      }
    },
  });

  return () => {
    dispose();
    clearRetry();
  };
}
