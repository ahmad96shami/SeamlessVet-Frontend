import { createOfflineWriteQueue, type QueuedRequest, type QueueStorage } from "@vet/shared";

import { prefs } from "@/services/mmkv";

/**
 * MMKV-backed implementation of the shared {@link QueueStorage} adapter. The whole
 * queue lives under one key as a JSON array — entries are coarse-grained (a single
 * REST request each), the on-device count rarely exceeds a few dozen, and a full
 * rewrite per mutation is well inside MMKV's synchronous JSI write budget.
 *
 * The store is the mobile sibling of the web's Dexie store (`apps/web/src/services/db.ts`)
 * — same shape, same lifecycle, so the shared queue logic in `@vet/shared` runs
 * unchanged on both surfaces. Tokens stay in `expo-secure-store`; MMKV is fine for
 * captured request bodies (no credentials, no PII beyond what the user already typed
 * into a form that will hit the API anyway).
 */
const KEY = "offlineQueue:v1";

function readAll(): QueuedRequest[] {
  const json = prefs.getString(KEY);
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? (parsed as QueuedRequest[]) : [];
  } catch {
    // A corrupt value is treated as an empty queue — the alternative is to bubble
    // an exception into the engine and freeze the app. Worst case the field doctor
    // re-issues the (still-uncommitted) action.
    return [];
  }
}

function writeAll(items: QueuedRequest[]): void {
  prefs.set(KEY, JSON.stringify(items));
}

const storage: QueueStorage = {
  add: async (request) => {
    writeAll([...readAll(), request]);
  },
  list: async () => readAll(),
  update: async (id, patch) => {
    writeAll(readAll().map((r) => (r.id === id ? { ...r, ...patch } : r)));
  },
  remove: async (id) => {
    writeAll(readAll().filter((r) => r.id !== id));
  },
  clear: async () => {
    prefs.remove(KEY);
  },
};

/**
 * App-wide offline REST-write queue. Mo4 wires it for field-invoice / exam-fee /
 * receipt-voucher issuance; Mo6 will surface its conflict-review UI. The queue is
 * persisted to MMKV, so a cold start picks up exactly where the last session left
 * off — the engine drains it as soon as PowerSync reports `connected`.
 */
export const offlineQueue = createOfflineWriteQueue(storage);
