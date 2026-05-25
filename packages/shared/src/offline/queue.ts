import type { AxiosInstance } from "axios";

import { IDEMPOTENCY_HEADER } from "../constants";
import { toApiError } from "../http/errors";
import { newGuidV7 } from "../http/idempotency";

export type HttpMethod = "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * A queued request's lifecycle:
 *   - `pending`  — enqueued, awaiting (re)play.
 *   - `failed`   — last replay hit a *transient* error (offline / 5xx / 429); auto-retried next drain.
 *   - `conflict` — server *rejected* it (4xx business rule: server-wins, insufficient stock, settlement
 *                  lock…). NOT auto-retried — surfaced for the user to resolve (PRD §8.4, no silent loss).
 */
export type QueuedRequestStatus = "pending" | "failed" | "conflict";

/**
 * One captured API call, persisted locally until it replays through the API. The web offline
 * queue records the *exact* REST request a write would have made (method + url + body carrying the
 * client-minted row id + a STABLE idempotency key) and replays it verbatim on reconnect — so the
 * online and offline paths are identical and the server stays the single source of truth for all
 * money/inventory assembly. (A `/sync/{table}` write is just one possible `url`, so this is a
 * superset of the row-level sync model.)
 */
export interface QueuedRequest {
  /** Queue-entry id (GUID v7 — time-ordered, so it doubles as the FIFO key). */
  id: string;
  method: HttpMethod;
  /** Request path relative to the client `baseURL`, e.g. `/pos/invoices` or `/sync/customers`. */
  url: string;
  /** JSON body — already carries the client-minted row `id` where the endpoint expects one. */
  body?: unknown;
  /** STABLE idempotency key — REUSED on every replay so a retried submit applies at most once. */
  idempotencyKey: string;
  /** i18n key (or text) naming the action for the sync UI, e.g. `sync.label.posSale`. */
  label: string;
  /** Coarse entity kind for grouping / optimistic-cache linking, e.g. `invoice` | `visit`. */
  entityKind?: string;
  /** The client-minted row id this request creates/affects (links the optimistic cache entry). */
  entityId?: string;
  createdAt: string;
  attempts: number;
  status: QueuedRequestStatus;
  /** Last error message (transient or conflict). */
  lastError?: string;
  /** Last `ApiError.code` on a conflict (the server-wins / business-rejection code). */
  lastCode?: string;
}

/** What a write action supplies; the queue fills in id/createdAt/attempts/status. */
export type RequestDescriptor = Pick<
  QueuedRequest,
  "method" | "url" | "label" | "idempotencyKey"
> &
  Partial<Pick<QueuedRequest, "body" | "entityKind" | "entityId">>;

/**
 * Storage backend for the queue — implemented per app (the platform-specific bit):
 *   web: Dexie (IndexedDB) · mobile: PowerSync's own CRUD upload queue.
 * `shared` owns the queue model + replay logic; the app owns persistence.
 */
export interface QueueStorage {
  add(request: QueuedRequest): Promise<void>;
  list(): Promise<QueuedRequest[]>;
  update(id: string, patch: Partial<QueuedRequest>): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

/** The offline write-queue contract every offline-capable mutation flows through. */
export interface OfflineWriteQueue {
  enqueue(descriptor: RequestDescriptor): Promise<QueuedRequest>;
  /** Items eligible to (re)play now — `pending` + (transiently) `failed`, oldest-first. */
  replayable(): Promise<QueuedRequest[]>;
  /** Everything still unsynced (storage only holds unsynced rows; completed ones are removed). */
  all(): Promise<QueuedRequest[]>;
  /** Total unsynced count (drives the indicator badge). */
  count(): Promise<number>;
  /** Count of items rejected by the server, awaiting manual resolution. */
  conflictCount(): Promise<number>;
  /** Synced OK → drop it. */
  complete(id: string): Promise<void>;
  /** Transient failure → keep for the next drain. */
  markFailed(id: string, error: string): Promise<void>;
  /** Server rejection → park as a conflict for review. */
  markConflict(id: string, code: string | undefined, error: string): Promise<void>;
  /** Re-arm a failed/conflict item for replay (user hit "retry"). */
  retry(id: string): Promise<void>;
  /** Discard one item (user chose to drop it). */
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

const REPLAYABLE: ReadonlySet<QueuedRequestStatus> = new Set(["pending", "failed"]);

function byCreatedAt(a: QueuedRequest, b: QueuedRequest): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/** Build a queue over an app-supplied {@link QueueStorage}. */
export function createOfflineWriteQueue(storage: QueueStorage): OfflineWriteQueue {
  const find = async (id: string) => (await storage.list()).find((r) => r.id === id);
  const bumpAttempts = (current: QueuedRequest | undefined) => (current?.attempts ?? 0) + 1;

  return {
    async enqueue(input) {
      const request: QueuedRequest = {
        id: newGuidV7(),
        method: input.method,
        url: input.url,
        body: input.body,
        idempotencyKey: input.idempotencyKey,
        label: input.label,
        entityKind: input.entityKind,
        entityId: input.entityId,
        createdAt: new Date().toISOString(),
        attempts: 0,
        status: "pending",
      };
      await storage.add(request);
      return request;
    },
    async replayable() {
      return (await storage.list()).filter((r) => REPLAYABLE.has(r.status)).sort(byCreatedAt);
    },
    all: async () => (await storage.list()).sort(byCreatedAt),
    async count() {
      return (await storage.list()).length;
    },
    async conflictCount() {
      return (await storage.list()).filter((r) => r.status === "conflict").length;
    },
    complete: (id) => storage.remove(id),
    async markFailed(id, error) {
      const current = await find(id);
      await storage.update(id, { status: "failed", lastError: error, attempts: bumpAttempts(current) });
    },
    async markConflict(id, code, error) {
      const current = await find(id);
      await storage.update(id, {
        status: "conflict",
        lastCode: code,
        lastError: error,
        attempts: bumpAttempts(current),
      });
    },
    retry: (id) => storage.update(id, { status: "pending" }),
    remove: (id) => storage.remove(id),
    clear: () => storage.clear(),
  };
}

// ---- Replay -----------------------------------------------------------------

/** How a failed replay should be treated. */
export type ReplayOutcome = "retryable" | "conflict";

/**
 * Classify a replay failure. A missing status (network error), 5xx, or 429 is *transient* — keep
 * retrying. A 4xx business rejection (409 server-wins, 422, 403, 404, 400) is a *conflict* the user
 * must resolve. A bubbled 401 is treated as transient (the client interceptor handles refresh).
 */
export function classifyReplay(err: unknown): { outcome: ReplayOutcome; code?: string; message: string } {
  const apiError = toApiError(err);
  const status = apiError.status;
  const transient = status === undefined || status === 0 || status === 401 || status === 429 || status >= 500;
  return { outcome: transient ? "retryable" : "conflict", code: apiError.code, message: apiError.message };
}

/** Fire one descriptor through the API with its STABLE idempotency key. */
export async function sendRequest<T = unknown>(
  client: AxiosInstance,
  descriptor: Pick<QueuedRequest, "method" | "url" | "body" | "idempotencyKey">,
): Promise<T> {
  const headers = { [IDEMPOTENCY_HEADER]: descriptor.idempotencyKey };
  const { url, body } = descriptor;
  switch (descriptor.method) {
    case "POST":
      return (await client.post(url, body ?? {}, { headers })).data as T;
    case "PUT":
      return (await client.put(url, body ?? {}, { headers })).data as T;
    case "PATCH":
      return (await client.patch(url, body ?? {}, { headers })).data as T;
    case "DELETE":
      return (await client.delete(url, { headers, data: body })).data as T;
  }
}

export interface DrainOptions {
  batchSize?: number;
  onProgress?: (done: number, total: number) => void;
}

export interface DrainResult {
  completed: number;
  /** Items that hit a transient error and stay queued. */
  retryable: number;
  /** Items the server rejected, now parked for review. */
  conflicts: number;
}

/**
 * Replays queued requests through the API, oldest-first, each carrying its STABLE idempotency key
 * (so a retried submit applies at most once — server-side dedupe). Stops at the first *transient*
 * failure (we're likely offline again, and later items may depend on the one that failed), but
 * continues past a *conflict* (a permanent rejection of one item; unrelated items can still sync).
 */
export async function drainQueue(
  queue: OfflineWriteQueue,
  client: AxiosInstance,
  options: DrainOptions = {},
): Promise<DrainResult> {
  const { batchSize = 25, onProgress } = options;
  const batch = (await queue.replayable()).slice(0, batchSize);
  const result: DrainResult = { completed: 0, retryable: 0, conflicts: 0 };

  for (const [index, req] of batch.entries()) {
    try {
      await sendRequest(client, req);
      await queue.complete(req.id);
      result.completed += 1;
    } catch (err) {
      const classified = classifyReplay(err);
      if (classified.outcome === "conflict") {
        await queue.markConflict(req.id, classified.code, classified.message);
        result.conflicts += 1;
      } else {
        await queue.markFailed(req.id, classified.message);
        result.retryable += 1;
        break; // transient — stop; the next reconnect retries from here, preserving order.
      }
    }
    onProgress?.(index + 1, batch.length);
  }

  return result;
}
