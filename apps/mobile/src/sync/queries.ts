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

/**
 * Returns the customer's current active contract id, or null.
 *
 * M15 farm awareness: when the visit is at a specific farm, an active contract that
 * *explicitly covers* that farm (a `contract_farms` row) wins over the plain
 * latest-active fallback — so a customer running separate farm contracts links the
 * right one. With no farm (or no covering contract) the pre-M15 behaviour holds.
 */
export async function findActiveContractIdForCustomer(
  customerId: string,
  farmId?: string | null,
): Promise<string | null> {
  if (farmId) {
    const covered = await powerSync.getOptional<{ id: string }>(
      `SELECT c.id FROM contracts c
         JOIN contract_farms cf ON cf.contract_id = c.id
         WHERE c.customer_id = ? AND c.status = 'active' AND cf.farm_id = ?
         ORDER BY c.updated_at DESC
         LIMIT 1`,
      [customerId, farmId],
    );
    if (covered) return covered.id;
  }
  const row = await powerSync.getOptional<{ id: string }>(
    `SELECT id FROM contracts
       WHERE customer_id = ? AND status = 'active'
       ORDER BY updated_at DESC
       LIMIT 1`,
    [customerId],
  );
  return row?.id ?? null;
}

/**
 * Returns the customer's currently open batch id (M8 entitlement gate), or null.
 *
 * M15 farm awareness: a farm-scoped visit prefers that farm's open batch, then a
 * whole-customer batch (`farm_id` NULL) — never another farm's (the invoice would
 * route to the wrong ledger: Invoice.FarmId = visit ?? batch). With no farm picked
 * the pre-M15 latest-open behaviour holds.
 */
export async function findOpenBatchIdForCustomer(
  customerId: string,
  farmId?: string | null,
): Promise<string | null> {
  if (farmId) {
    const row = await powerSync.getOptional<{ id: string }>(
      `SELECT id FROM batches
         WHERE customer_id = ? AND status = 'open' AND (farm_id = ? OR farm_id IS NULL)
         ORDER BY (CASE WHEN farm_id = ? THEN 0 ELSE 1 END), updated_at DESC
         LIMIT 1`,
      [customerId, farmId, farmId],
    );
    return row?.id ?? null;
  }
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
