import { createOfflineWriteQueue, type QueueStorage } from "@vet/shared";

import { db } from "@/services/db";

/** Dexie-backed implementation of the shared {@link QueueStorage} adapter. */
const storage: QueueStorage = {
  add: async (request) => {
    await db.requests.add(request);
  },
  list: () => db.requests.orderBy("createdAt").toArray(),
  update: async (id, patch) => {
    await db.requests.update(id, patch);
  },
  remove: async (id) => {
    await db.requests.delete(id);
  },
  clear: () => db.requests.clear(),
};

/**
 * App-wide offline write-queue (Dexie-backed). Offline-capable writes enqueue here as captured REST
 * requests and replay verbatim through the API on reconnect (the sync engine, W7.5). Idempotency
 * keys are stable per entry, so a replayed submit applies at most once.
 */
export const offlineQueue = createOfflineWriteQueue(storage);
