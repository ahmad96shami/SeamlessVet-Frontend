import { queryClient } from "@/lib/queryClient";
import { setEnvironment, wipeCurrentEnvironment } from "@/services/db";
import { refreshSyncCounts, resetSyncForEnv } from "@/services/syncEngine";

/**
 * Per-tenant offline isolation, orchestrated from the auth lifecycle (W24). The local Dexie DB is
 * keyed by `environmentId`; switching centers must also drop the in-memory query cache (which has
 * no env key) and re-point the sync engine, so no center ever sees another's reads or queued writes.
 */

/**
 * Activate a center's local storage (login / restore). On an actual change of env it closes the old
 * DB, drops the stale in-memory query cache, and re-arms sync for the new tenant. A same-env restore
 * is a no-op — crucially, it preserves the query cache the persister just hydrated from disk.
 */
export function enterEnvironment(environmentId: string): void {
  if (!setEnvironment(environmentId)) return;
  queryClient.clear();
  void resetSyncForEnv();
}

/**
 * Manual sign-out: wipe the center's DB (queued writes, parked sales, cached reads) so nothing
 * lingers on a shared browser, then drop the in-memory cache. Involuntary logouts (expired session /
 * suspended center) deliberately do NOT call this — their data is kept for when the user returns.
 */
export async function exitEnvironment(): Promise<void> {
  await wipeCurrentEnvironment();
  queryClient.clear();
  void refreshSyncCounts();
}
