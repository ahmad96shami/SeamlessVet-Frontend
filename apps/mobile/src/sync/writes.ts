import { v7 as uuidv7 } from "uuid";

import { powerSync } from "./database";

/**
 * Local-write helpers for tables that PowerSync mirrors in on-device SQLite.
 *
 * Writes go through {@link powerSync.execute} — the SDK captures the change into its CRUD
 * queue, and {@link VetBackendConnector.uploadData} (sync/connector.ts) drains it through
 * the matching `/sync/{table}` PUT/PATCH/DELETE on reconnect. This is the "row CRUD →
 * PowerSync uploadData" half of Mo2's hybrid write model — the other half (POS-style
 * server-assembly endpoints) belongs to Mo4.
 *
 * Column names are snake_case (server-canonical) so the upload payload round-trips
 * verbatim against the AppSchema mirror declared in sync/schema.ts. Each insert mints a
 * client GUID v7 — the universal id-on-the-client rule.
 *
 * Helpers always return the row id so the caller can navigate or chain (e.g., create the
 * customer, then immediately create their first pet).
 */

/** A column→value map; values are SQLite-friendly (text/number/null). */
type Row = Record<string, string | number | null | undefined>;

function buildInsert(table: string, row: Row): { sql: string; params: unknown[] } {
  const entries = Object.entries(row).filter(([, v]) => v !== undefined);
  const columns = entries.map(([k]) => k).join(", ");
  const placeholders = entries.map(() => "?").join(", ");
  const params = entries.map(([, v]) => (v ?? null));
  return { sql: `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, params };
}

function buildUpdate(table: string, id: string, row: Row): { sql: string; params: unknown[] } {
  const entries = Object.entries(row).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    return { sql: `UPDATE ${table} SET id = id WHERE id = ?`, params: [id] };
  }
  const assignments = entries.map(([k]) => `${k} = ?`).join(", ");
  const params = [...entries.map(([, v]) => (v ?? null)), id];
  return { sql: `UPDATE ${table} SET ${assignments} WHERE id = ?`, params };
}

/** Insert a fresh row (mints a GUID v7); returns its id. */
export async function syncInsert(table: string, row: Row): Promise<string> {
  const id = uuidv7();
  const { sql, params } = buildInsert(table, { id, ...row });
  await powerSync.execute(sql, params);
  return id;
}

/** Patch an existing row by id (only the supplied columns change). */
export async function syncUpdate(table: string, id: string, row: Row): Promise<void> {
  const { sql, params } = buildUpdate(table, id, row);
  await powerSync.execute(sql, params);
}

/** Soft-delete a row by id (PowerSync emits DELETE → /sync/{table}/{id}). */
export async function syncDelete(table: string, id: string): Promise<void> {
  await powerSync.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
}
