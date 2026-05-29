import {
  type AbstractPowerSyncDatabase,
  type CrudEntry,
  type PowerSyncBackendConnector,
  type PowerSyncCredentials,
  UpdateType,
} from "@powersync/react-native";
import { classifyReplay, fetchPowerSyncToken, IDEMPOTENCY_HEADER, idempotencyKey } from "@vet/shared";

import { POWERSYNC_BASE_URL } from "@/lib/config";
import { apiClient } from "@/services/apiClient";
import { countPowerSyncConflicts, recordPowerSyncConflict } from "@/services/powerSyncConflicts";
import { useSyncStore } from "@/stores/syncStore";

/**
 * Bridges PowerSync's SDK to the .NET backend.
 *
 * - {@link fetchCredentials}: mints a short-lived stream JWT via `POST /auth/powersync-token`
 *   (auth-bearer-protected; the shared apiClient supplies the user's access token, refreshes
 *   on 401, etc.) and returns it with the PowerSync Service endpoint the SDK should stream from.
 *
 * - {@link uploadData}: drains the SDK's local CRUD queue one *transaction* at a time
 *   (Mo1.3) and replays each row through the matching `/sync/{table}` write endpoint
 *   (PUT for inserts, PATCH for updates, DELETE for soft deletes). Each row carries a
 *   stable `Idempotency-Key` so a replayed transaction applies at most once server-side.
 *   Transient failures (network / 5xx / 429 / auth-not-yet-refreshed) are RE-thrown so the
 *   SDK schedules the standard retry; permanent server-side rejections (4xx business rules
 *   like negative_stock, settlement_locked) are also re-thrown — the rejected entry stays
 *   in the queue and Mo6 builds the surface that promotes it into the conflict-review UI.
 */
export class VetBackendConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const { token, expiresAt } = await fetchPowerSyncToken(apiClient);
    return {
      endpoint: POWERSYNC_BASE_URL,
      token,
      expiresAt: new Date(expiresAt),
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    // Mo6.2 — split transient vs. permanent so the queue never stalls *and* nothing is lost:
    //   • transient (network / 5xx / 429 / 401) → RE-THROW. The SDK pauses and retries the whole
    //     transaction; each entry's stable Idempotency-Key makes the re-send a server-side no-op.
    //   • conflict (4xx server-wins: visit_server_authoritative, negative_stock, …) → record it to
    //     the parked-rejection store and DISCARD the op (skip + complete the txn). Re-throwing a
    //     hard 4xx would block the CRUD queue forever; instead the server re-streams its
    //     authoritative row over our local one, and the doctor sees the rejection in the review
    //     sheet (PRD §8.4 — no silent loss).
    for (const entry of transaction.crud) {
      try {
        await sendCrudEntry(entry);
      } catch (err) {
        const classified = classifyReplay(err);
        if (classified.outcome === "retryable") throw err;
        recordPowerSyncConflict({
          id: idempotencyKeyForEntry(entry),
          table: entry.table,
          op: String(entry.op),
          rowId: entry.id,
          code: classified.code,
          message: classified.message,
          createdAt: new Date().toISOString(),
        });
        // Reflect the parked rejection on the indicator immediately — even if a later entry in
        // this same transaction throws transiently before we reach complete().
        useSyncStore.getState().set({ psConflictCount: countPowerSyncConflicts() });
      }
    }
    await transaction.complete();
  }
}

/**
 * Replay one CRUD entry through `/sync/{table}`. The body for a PUT carries the client-minted
 * GUID v7 `id` alongside the column values (the backend's `SyncModule` requires it). PATCH
 * sends only the changed columns (PowerSync's `opData`). DELETE is soft-delete.
 */
async function sendCrudEntry(entry: CrudEntry): Promise<void> {
  const headers = { [IDEMPOTENCY_HEADER]: idempotencyKeyForEntry(entry) };

  switch (entry.op) {
    case UpdateType.PUT: {
      const body = { id: entry.id, ...(entry.opData ?? {}) };
      await apiClient.put(`/sync/${entry.table}`, body, { headers });
      return;
    }
    case UpdateType.PATCH: {
      await apiClient.patch(`/sync/${entry.table}/${entry.id}`, entry.opData ?? {}, { headers });
      return;
    }
    case UpdateType.DELETE: {
      await apiClient.delete(`/sync/${entry.table}/${entry.id}`, { headers });
      return;
    }
  }
}

/**
 * Stable idempotency key per CRUD entry: PowerSync's `clientId` is a monotonic per-database
 * counter, so a retry of the same local row mints the same key and the server's
 * `idempotency_keys` table dedupes the replay.
 */
function idempotencyKeyForEntry(entry: CrudEntry): string {
  // The clientId+table+op tuple is stable across retries of the same local write;
  // the shared `idempotencyKey()` mint is only used as a fallback if the SDK ever
  // surfaces an entry without a clientId (it shouldn't, but the type allows it).
  if (entry.clientId !== undefined && entry.clientId !== null) {
    return `ps-${entry.table}-${entry.op}-${entry.clientId}`;
  }
  return idempotencyKey();
}
