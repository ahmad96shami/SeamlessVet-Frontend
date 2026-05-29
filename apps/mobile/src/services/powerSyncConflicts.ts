import { prefs } from "@/services/mmkv";

/**
 * A PowerSync CRUD upload the server **rejected** (a 4xx business rule, not a transient error) and
 * we parked for the doctor to see. PRD §8.4: financial / medication / closed-visit edits are
 * server-wins — a rejected offline edit must surface (no silent loss), but it must **not** block
 * PowerSync's upload queue. So {@link VetBackendConnector.uploadData} records the rejection here,
 * discards the op, and lets the server re-stream its authoritative row over the local one.
 *
 * Unlike the REST-intent queue ({@link offlineQueue}), these are **not retryable** — the server
 * already won and the local op is gone. The only action is "dismiss" (acknowledge).
 */
export interface PowerSyncConflict {
  /**
   * Stable per local op (PowerSync `clientId`-derived, same basis as the idempotency key) so a
   * re-record during an SDK retry **upserts** rather than duplicating.
   */
  id: string;
  /** Synced table the op targeted, e.g. `visits`, `ledger_entries`, `inventory_movements`. */
  table: string;
  /** PowerSync op — `PUT` | `PATCH` | `DELETE`. */
  op: string;
  /** The affected row id (links back to the local record). */
  rowId: string;
  /** `ApiError.code` (e.g. `visit_server_authoritative`, `negative_stock`, `settlement_locked`). */
  code?: string;
  /** Human-readable server message. */
  message: string;
  createdAt: string;
}

const KEY = "psConflicts:v1";

function readAll(): PowerSyncConflict[] {
  const json = prefs.getString(KEY);
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? (parsed as PowerSyncConflict[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: PowerSyncConflict[]): void {
  prefs.set(KEY, JSON.stringify(items));
}

/** Upsert a parked rejection by its stable id (re-recording during an SDK retry is a no-op-ish). */
export function recordPowerSyncConflict(conflict: PowerSyncConflict): void {
  const existing = readAll().filter((c) => c.id !== conflict.id);
  writeAll([...existing, conflict]);
}

/** All parked rejections, oldest-first. */
export function listPowerSyncConflicts(): PowerSyncConflict[] {
  return readAll().sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

export function countPowerSyncConflicts(): number {
  return readAll().length;
}

/** Acknowledge one — the doctor has seen the server-wins outcome. */
export function dismissPowerSyncConflict(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id));
}

export function clearPowerSyncConflicts(): void {
  prefs.remove(KEY);
}
