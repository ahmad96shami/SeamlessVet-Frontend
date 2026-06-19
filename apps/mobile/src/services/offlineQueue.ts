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
// The queue is keyed PER CENTER (Mo13): a field doctor who logs out of one center and into
// another must never replay the first center's queued money writes against the second. The env
// id is published here by the auth store ({@link setQueueEnvironment}) on login / restore and
// cleared on logout, so every read/write below resolves to that tenant's own slot. Logged out
// (no env), the queue falls back to the legacy anon key — which in practice holds nothing, since
// you must be signed in to enqueue.
const LEGACY_KEY = "offlineQueue:v1";
const ENV_KEY = "offlineQueue.env";
const keyFor = (envId: string): string => `offlineQueue:${envId}:v1`;

/** The MMKV key for the queue slot the current session writes to. */
function currentKey(): string {
  const envId = prefs.getString(ENV_KEY);
  return envId ? keyFor(envId) : LEGACY_KEY;
}

function readKey(key: string): QueuedRequest[] {
  const json = prefs.getString(key);
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

function readAll(): QueuedRequest[] {
  return readKey(currentKey());
}

function writeAll(items: QueuedRequest[]): void {
  prefs.set(currentKey(), JSON.stringify(items));
}

/**
 * Publish the active center so the queue reads/writes its per-tenant slot. Called by the auth
 * store on login / restore (with the env id) and on logout (with `null`). On first scoping for a
 * given env, any items still parked under the pre-Mo13 anon key (`offlineQueue:v1`) are migrated
 * into the tenant slot so an in-flight upgrade never orphans a queued field sale.
 */
export function setQueueEnvironment(envId: string | null): void {
  if (!envId) {
    prefs.remove(ENV_KEY);
    return;
  }
  prefs.set(ENV_KEY, envId);
  // One-time legacy migration: move pre-Mo13 anon-keyed items into this center's slot, but never
  // clobber items already there (a later session for the same env keeps its own queue).
  const legacy = readKey(LEGACY_KEY);
  if (legacy.length > 0 && readKey(keyFor(envId)).length === 0) {
    prefs.set(keyFor(envId), JSON.stringify(legacy));
    prefs.remove(LEGACY_KEY);
  }
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
    prefs.remove(currentKey());
  },
};

/**
 * App-wide offline REST-write queue. Mo4 wires it for field-invoice / exam-fee /
 * receipt-voucher issuance; Mo6 will surface its conflict-review UI. The queue is
 * persisted to MMKV, so a cold start picks up exactly where the last session left
 * off — the engine drains it as soon as PowerSync reports `connected`.
 */
export const offlineQueue = createOfflineWriteQueue(storage);
