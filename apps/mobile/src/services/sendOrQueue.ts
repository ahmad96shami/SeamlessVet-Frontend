import { classifyReplay, sendRequest, type RequestDescriptor } from "@vet/shared";

import { apiClient } from "@/services/apiClient";
import { offlineQueue } from "@/services/offlineQueue";
import { notifyEnqueued } from "@/services/syncEngine";
import { powerSync } from "@/sync/database";

export interface SendOrQueueResult {
  /** The affected row id — client-minted by the descriptor builder, so it's known up-front. */
  id: string;
  /** True when the write was parked in the offline queue (offline, or a transient send failure). */
  queued: boolean;
}

const isOnline = (): boolean => powerSync.currentStatus.connected;

/**
 * The single entry point for an offline-capable mobile write. Mirrors the web
 * `sendOrQueue` (`apps/web/src/services/sendOrQueue.ts`) so the call shape is the
 * same on both surfaces: pass a {@link RequestDescriptor} (typically built by a
 * shared `build*Request` helper that mints the client GUID v7 id + idempotency key),
 * and the wrapper either:
 *
 * 1. Online → fires the request immediately. A transient send failure (network /
 *    5xx / 429) falls through to enqueue + queue-it-for-the-engine.
 * 2. Offline → enqueues the request for later replay; the engine drains it as soon
 *    as PowerSync reports `connected` again.
 * 3. A *conflict* (4xx business rejection — `negative_stock`, `settlement_locked`,
 *    …) is RE-thrown so the caller can show the right error UI; the descriptor is
 *    NOT silently parked, matching the web behaviour and PRD §8.4.
 *
 * The row id is client-minted and returned either way, so callers can navigate or
 * print before the server confirms (the Mo4 field-invoice flow refetches the
 * invoice on reconnect to populate the formatted receipt).
 */
export async function sendOrQueue(descriptor: RequestDescriptor): Promise<SendOrQueueResult> {
  const id = descriptor.entityId ?? "";

  if (!isOnline()) {
    await offlineQueue.enqueue(descriptor);
    await notifyEnqueued();
    return { id, queued: true };
  }

  try {
    await sendRequest(apiClient, descriptor);
    return { id, queued: false };
  } catch (err) {
    if (classifyReplay(err).outcome === "retryable") {
      // We thought we were online but the send failed transiently — queue and let the engine retry.
      await offlineQueue.enqueue(descriptor);
      await notifyEnqueued();
      return { id, queued: true };
    }
    throw err; // a genuine server rejection — let the form/toast show it.
  }
}
