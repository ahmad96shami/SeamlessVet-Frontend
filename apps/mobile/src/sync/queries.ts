import { powerSync } from "./database";

/**
 * One-shot read helpers used by the new-visit flow (Mo2.2) to auto-link the visit to the
 * customer's active contract + open batch. PowerSync's watched `useQuery` is overkill for a
 * single value fetched once at form-submit time — these go straight to the underlying SQLite
 * via `getOptional` and return primitive values.
 *
 * The selection rules mirror PRD §6.6: "Identifies the active contract and batch" — at most
 * one of each is expected per customer at any given moment; if there's a tie we pick the
 * latest-updated, which matches the web's visit-create behaviour.
 */

/** Returns the customer's current active contract id, or null. */
export async function findActiveContractIdForCustomer(customerId: string): Promise<string | null> {
  const row = await powerSync.getOptional<{ id: string }>(
    `SELECT id FROM contracts
       WHERE customer_id = ? AND status = 'active'
       ORDER BY updated_at DESC
       LIMIT 1`,
    [customerId],
  );
  return row?.id ?? null;
}

/** Returns the customer's currently open batch id (M8 entitlement gate), or null. */
export async function findOpenBatchIdForCustomer(customerId: string): Promise<string | null> {
  const row = await powerSync.getOptional<{ id: string }>(
    `SELECT id FROM batches
       WHERE customer_id = ? AND status = 'open'
       ORDER BY updated_at DESC
       LIMIT 1`,
    [customerId],
  );
  return row?.id ?? null;
}

/**
 * The default exam fee from `system_settings` (PRD §4 Admin Configuration). Returns null if
 * settings haven't streamed in yet — the form falls back to leaving the field empty so the
 * doctor enters it manually for that visit.
 */
export async function getDefaultExamFee(): Promise<number | null> {
  const row = await powerSync.getOptional<{ default_exam_fee: number | null }>(
    `SELECT default_exam_fee FROM system_settings LIMIT 1`,
  );
  return row?.default_exam_fee ?? null;
}

/**
 * Visit-number sources — the local visits this doctor has already authored carrying a
 * `visit_number`. Read once at create-time; the seq counter is computed in
 * `lib/visitNumber.ts → nextVisitNumber`.
 */
export async function listLocalVisitNumbers(doctorId: string): Promise<Array<{ visit_number: string | null }>> {
  return powerSync.getAll<{ visit_number: string | null }>(
    `SELECT visit_number FROM visits WHERE doctor_id = ? AND visit_number IS NOT NULL`,
    [doctorId],
  );
}
