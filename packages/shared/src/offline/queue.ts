import type { AxiosInstance } from "axios";

import { IDEMPOTENCY_HEADER } from "../constants";
import { newGuidV7 } from "../http/idempotency";

export type SyncOp = "PUT" | "PATCH" | "DELETE";
export type QueuedMutationStatus = "pending" | "syncing" | "failed";

/** One pending write, persisted locally until it syncs through the API. */
export interface QueuedMutation {
  /** Queue-entry id (GUID v7). */
  id: string;
  /** Target sync table → `/sync/{table}` (PUT) or `/sync/{table}/{rowId}` (PATCH/DELETE). */
  table: string;
  op: SyncOp;
  /** The row's client-generated GUID v7 (also sent in the body on PUT). */
  rowId: string;
  payload?: Record<string, unknown>;
  /** Stable idempotency key — REUSED on every replay so a retried submit applies at most once. */
  idempotencyKey: string;
  createdAt: string;
  attempts: number;
  status: QueuedMutationStatus;
  lastError?: string;
}

/** Fields the caller supplies; the queue fills in id/createdAt/attempts/status. */
export type NewQueuedMutation = Pick<
  QueuedMutation,
  "table" | "op" | "rowId" | "idempotencyKey"
> &
  Partial<Pick<QueuedMutation, "payload">>;

/**
 * Storage backend for the queue — implemented per app (the platform-specific bit):
 *   web: Dexie (IndexedDB) · mobile: SQLite / MMKV (PowerSync also has its own CRUD queue).
 * `shared` owns the queue model + replay logic; the app owns persistence.
 */
export interface QueueStorage {
  add(mutation: QueuedMutation): Promise<void>;
  list(): Promise<QueuedMutation[]>;
  update(id: string, patch: Partial<QueuedMutation>): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

/** The offline write-queue contract every mutation flows through (makes features offline-ready by construction). */
export interface OfflineWriteQueue {
  enqueue(mutation: NewQueuedMutation): Promise<QueuedMutation>;
  pending(): Promise<QueuedMutation[]>;
  pendingCount(): Promise<number>;
  all(): Promise<QueuedMutation[]>;
  complete(id: string): Promise<void>;
  fail(id: string, error: string): Promise<void>;
  clear(): Promise<void>;
}

/** Build a queue over an app-supplied {@link QueueStorage}. */
export function createOfflineWriteQueue(storage: QueueStorage): OfflineWriteQueue {
  const pending = async () => (await storage.list()).filter((m) => m.status !== "syncing");

  return {
    async enqueue(input) {
      const mutation: QueuedMutation = {
        id: newGuidV7(),
        table: input.table,
        op: input.op,
        rowId: input.rowId,
        payload: input.payload,
        idempotencyKey: input.idempotencyKey,
        createdAt: new Date().toISOString(),
        attempts: 0,
        status: "pending",
      };
      await storage.add(mutation);
      return mutation;
    },
    pending,
    async pendingCount() {
      return (await pending()).length;
    },
    all: () => storage.list(),
    complete: (id) => storage.remove(id),
    async fail(id, error) {
      const current = (await storage.list()).find((m) => m.id === id);
      await storage.update(id, {
        status: "failed",
        lastError: error,
        attempts: (current?.attempts ?? 0) + 1,
      });
    },
    clear: () => storage.clear(),
  };
}

export interface DrainOptions {
  batchSize?: number;
  onProgress?: (done: number, total: number) => void;
}

/**
 * Replays queued mutations through the API write path (`/sync/{table}`). Both the web
 * offline queue and PowerSync's upload connector use this shape. Each call carries the
 * mutation's STABLE idempotency key, so a retried submit is applied at most once
 * (server-side dedupe). A failed mutation is left queued for the next reconnect.
 */
export async function drainQueue(
  queue: OfflineWriteQueue,
  client: AxiosInstance,
  options: DrainOptions = {},
): Promise<{ completed: number; failed: number }> {
  const { batchSize = 25, onProgress } = options;
  const batch = (await queue.pending()).slice(0, batchSize);
  let completed = 0;
  let failed = 0;

  for (const [index, m] of batch.entries()) {
    const headers = { [IDEMPOTENCY_HEADER]: m.idempotencyKey };
    try {
      if (m.op === "PUT") {
        await client.put(`/sync/${m.table}`, { id: m.rowId, ...m.payload }, { headers });
      } else if (m.op === "PATCH") {
        await client.patch(`/sync/${m.table}/${m.rowId}`, m.payload ?? {}, { headers });
      } else {
        await client.delete(`/sync/${m.table}/${m.rowId}`, { headers });
      }
      await queue.complete(m.id);
      completed += 1;
    } catch (err) {
      await queue.fail(m.id, err instanceof Error ? err.message : String(err));
      failed += 1;
    }
    onProgress?.(index + 1, batch.length);
  }

  return { completed, failed };
}
