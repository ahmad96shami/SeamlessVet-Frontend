import { createOfflineWriteQueue, type QueueStorage } from "@vet/shared";

import { getDb } from "@/services/db";

/**
 * Dexie-backed implementation of the shared {@link QueueStorage} adapter. Every method resolves
 * {@link getDb} lazily so the queue follows the active center's DB across an env switch (W24).
 */
const storage: QueueStorage = {
  add: async (request) => {
    await getDb().requests.add(request);
  },
  list: () => getDb().requests.orderBy("createdAt").toArray(),
  update: async (id, patch) => {
    await getDb().requests.update(id, patch);
  },
  remove: async (id) => {
    await getDb().requests.delete(id);
  },
  clear: () => getDb().requests.clear(),
};

/**
 * App-wide offline write-queue (Dexie-backed). Offline-capable writes enqueue here as captured REST
 * requests and replay verbatim through the API on reconnect (the sync engine, W7.5). Idempotency
 * keys are stable per entry, so a replayed submit applies at most once.
 */
export const offlineQueue = createOfflineWriteQueue(storage);
