import Dexie, { type Table } from "dexie";
import type { QueuedRequest } from "@vet/shared";

/** Local IndexedDB (via Dexie). Holds the durable offline write-queue; W7 also adds a read-cache. */
class VetWebDb extends Dexie {
  /** Durable offline write-queue — REST requests captured offline and replayed on reconnect. */
  requests!: Table<QueuedRequest, string>;

  constructor() {
    super("vet-web");
    // v1 (W0): a `/sync`-shaped `mutations` store. v2 (W7): the generalised REST-request queue.
    this.version(1).stores({ mutations: "id, status, createdAt" });
    this.version(2).stores({ mutations: null, requests: "id, status, createdAt" });
  }
}

export const db = new VetWebDb();
