import Dexie, { type Table } from "dexie";
import type { QueuedMutation } from "@vet/shared";

/** Local IndexedDB (via Dexie). W0 holds the offline write-queue; W7 adds read-caches. */
class VetWebDb extends Dexie {
  mutations!: Table<QueuedMutation, string>;

  constructor() {
    super("vet-web");
    this.version(1).stores({ mutations: "id, status, createdAt" });
  }
}

export const db = new VetWebDb();
