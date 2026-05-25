import Dexie, { type Table } from "dexie";
import type { QueuedRequest } from "@vet/shared";

/** Local IndexedDB (via Dexie): the durable offline write-queue + the TanStack Query read-cache. */
class VetWebDb extends Dexie {
  /** Durable offline write-queue — REST requests captured offline and replayed on reconnect. */
  requests!: Table<QueuedRequest, string>;
  /** Key→value store backing the TanStack Query persister (offline reads). */
  kv!: Table<{ key: string; value: string }, string>;

  constructor() {
    super("vet-web");
    // v1 (W0): a `/sync`-shaped `mutations` store. v2 (W7): the generalised REST-request queue.
    this.version(1).stores({ mutations: "id, status, createdAt" });
    this.version(2).stores({ mutations: null, requests: "id, status, createdAt" });
    // v3 (W7): a KV store for the persisted query cache.
    this.version(3).stores({ requests: "id, status, createdAt", kv: "key" });
  }
}

export const db = new VetWebDb();
