import Dexie, { type Table } from "dexie";
import type { QueuedRequest } from "@vet/shared";

import { decodeJwt } from "@/lib/jwt";
import { tokenStorage } from "@/services/tokenStorage";
import type { ParkedSale } from "@/stores/posCartStore";

/** Local IndexedDB (via Dexie): the durable offline write-queue + the TanStack Query read-cache. */
class VetWebDb extends Dexie {
  /** Durable offline write-queue — REST requests captured offline and replayed on reconnect. */
  requests!: Table<QueuedRequest, string>;
  /** Key→value store backing the TanStack Query persister (offline reads). */
  kv!: Table<{ key: string; value: string }, string>;
  /** Parked (held) POS sales — local-only cart snapshots, resumable on the same terminal (W19). */
  parkedSales!: Table<ParkedSale, string>;

  constructor(name: string) {
    super(name);
    // v1 (W0): a `/sync`-shaped `mutations` store. v2 (W7): the generalised REST-request queue.
    this.version(1).stores({ mutations: "id, status, createdAt" });
    this.version(2).stores({ mutations: null, requests: "id, status, createdAt" });
    // v3 (W7): a KV store for the persisted query cache.
    this.version(3).stores({ requests: "id, status, createdAt", kv: "key" });
    // v4 (W19): parked POS sales, ordered by park time.
    this.version(4).stores({
      requests: "id, status, createdAt",
      kv: "key",
      parkedSales: "id, parkedAt",
    });
  }
}

/**
 * Per-tenant offline isolation (W24): the DB is keyed by the active center's `environmentId`
 * (`vet-web-{envId}`) so two centers sharing one browser never see each other's queued writes,
 * parked sales, or cached reads. It is opened lazily once the env is known (post-login/restore),
 * closed + reopened on env change, and wiped on a manual sign-out. A logged-out / pre-login app
 * falls back to an inert `vet-web-anon` store (the login screen makes no offline writes).
 */
const ANON = "anon";

function dbNameFor(envId: string | null): string {
  return `vet-web-${envId ?? ANON}`;
}

/** The env id carried by the persisted access token, so the right DB opens before login runs. */
function bootEnvId(): string | null {
  const token = tokenStorage.getTokens()?.accessToken;
  return (token && decodeJwt(token)?.environment_id) || null;
}

let currentEnvId: string | null = bootEnvId();
let currentDb: VetWebDb | null = null;

/** The live handle for the active center — lazily opened. Every storage adapter goes through this. */
export function getDb(): VetWebDb {
  if (!currentDb) currentDb = new VetWebDb(dbNameFor(currentEnvId));
  return currentDb;
}

/**
 * Point local storage at `envId`'s DB, closing the previous one. Returns whether the target
 * actually changed — callers use that to decide whether to drop the in-memory query cache and
 * re-arm sync (a same-env restore must NOT, or it would discard the just-hydrated offline cache).
 */
export function setEnvironment(envId: string | null): boolean {
  if (envId === currentEnvId) return false;
  if (currentDb) {
    currentDb.close();
    currentDb = null;
  }
  currentEnvId = envId;
  return true;
}

/** Delete the active center's DB outright (manual sign-out) — no tenant data lingers on the browser. */
export async function wipeCurrentEnvironment(): Promise<void> {
  const name = dbNameFor(currentEnvId);
  if (currentDb) {
    currentDb.close();
    currentDb = null;
  }
  await Dexie.delete(name);
  currentEnvId = null;
}
