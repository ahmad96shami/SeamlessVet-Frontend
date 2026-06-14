import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { QueryKey } from "@tanstack/react-query";

import { getDb } from "@/services/db";

/**
 * Bump on any change that alters persisted query *shapes* (or to force a cold start). The persister
 * discards a cache whose buster differs, so stale data from an older build never rehydrates.
 */
export const QUERY_CACHE_BUSTER = "w7.1";

/** A week — old enough to survive multi-day field trips, young enough to not hoard stale rows. */
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

/**
 * Read namespaces safe to keep offline: reference/catalog + the hot operational reads the offline
 * flows need (POS catalog, customer picker, the visits/appointments lists). Deliberately EXCLUDES
 * financial history (invoices, receipt-vouchers, statements) and admin-sensitive lists (users,
 * registration-requests) — those should always come fresh from the server.
 */
const CACHEABLE_KEYS: ReadonlySet<string> = new Set([
  "products",
  "services",
  "system-settings",
  "inventory",
  "customers",
  "pets",
  "visits",
  "appointments",
]);

/** Only persist successful reads from the whitelisted namespaces. */
export function shouldDehydrateQuery(queryKey: QueryKey): boolean {
  const root = Array.isArray(queryKey) ? queryKey[0] : queryKey;
  return typeof root === "string" && CACHEABLE_KEYS.has(root);
}

/**
 * Dexie-backed AsyncStorage for the persister — reuses the app's IndexedDB (no extra dep). Resolves
 * {@link getDb} per call so the persisted cache follows the active center's DB across a switch (W24).
 */
const dexieStorage = {
  getItem: async (key: string) => (await getDb().kv.get(key))?.value ?? null,
  setItem: async (key: string, value: string) => {
    await getDb().kv.put({ key, value });
  },
  removeItem: async (key: string) => {
    await getDb().kv.delete(key);
  },
};

export const queryPersister = createAsyncStoragePersister({
  storage: dexieStorage,
  key: "vet-query-cache",
  throttleTime: 1000,
});
