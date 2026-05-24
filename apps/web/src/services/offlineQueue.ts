import { createOfflineWriteQueue, type QueueStorage } from "@vet/shared";

import { db } from "@/services/db";

/** Dexie-backed implementation of the shared QueueStorage adapter. */
const storage: QueueStorage = {
  add: async (mutation) => {
    await db.mutations.add(mutation);
  },
  list: () => db.mutations.orderBy("createdAt").toArray(),
  update: async (id, patch) => {
    await db.mutations.update(id, patch);
  },
  remove: async (id) => {
    await db.mutations.delete(id);
  },
  clear: () => db.mutations.clear(),
};

/**
 * App-wide offline write-queue (Dexie-backed). Mutations enqueue here and replay through
 * `/sync/{table}` via the shared `drainQueue()`. Auto-drain on reconnect + sync-status UI is W7.
 */
export const offlineQueue = createOfflineWriteQueue(storage);
