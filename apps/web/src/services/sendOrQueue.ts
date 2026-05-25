import { classifyReplay, sendRequest, type RequestDescriptor } from "@vet/shared";

import { apiClient } from "@/services/apiClient";
import { offlineQueue } from "@/services/offlineQueue";
import { notifyEnqueued } from "@/services/syncEngine";

export interface SendOrQueueResult {
  /** The affected row id — client-minted, so it's known whether the write was sent or queued. */
  id: string;
  /** true when the write was parked in the offline queue (offline, or a transient send failure). */
  queued: boolean;
}

const isOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine);

/**
 * The single entry point for an offline-capable write. When online it fires the request; when
 * offline (or a *transient* send failure — network/5xx/429) it parks the request in the queue for
 * the sync engine to replay. A real *conflict* (4xx business rejection) is thrown so the caller can
 * surface it. The row id is client-minted and returned either way, so callers can update the UI
 * optimistically without waiting for the server.
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
