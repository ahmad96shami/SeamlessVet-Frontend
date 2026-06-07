import type { AxiosInstance } from "axios";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  BatchSettleRequestSchema,
  BatchSettlementPreviewSchema,
  BatchSettlementSchema,
  type BatchSettleRequest,
  type BatchSettlement,
  type BatchSettlementPreview,
} from "../schemas/batchSettlements";

// M24 — تصفية الدورة. Settling is a money decision: Admin/Accountant, online-only (gated on
// `contracts.activate`), no /sync surface. The body carries its own idempotencyKey (entity-level
// replay) alongside the auto-injected `Idempotency-Key` header; the wrapper mints both plus the
// client GUID v7 id, so a network retry can never settle twice.

/** GET /batches/{id}/settlement/preview — the settle screen's read model. */
export async function getBatchSettlementPreview(
  client: AxiosInstance,
  batchId: string,
): Promise<BatchSettlementPreview> {
  const res = await client.get(`/batches/${batchId}/settlement/preview`);
  return BatchSettlementPreviewSchema.parse(res.data);
}

/** GET /batches/{id}/settlement — the settlement document (404 until the batch is settled). */
export async function getBatchSettlement(
  client: AxiosInstance,
  batchId: string,
): Promise<BatchSettlement> {
  const res = await client.get(`/batches/${batchId}/settlement`);
  return BatchSettlementSchema.parse(res.data);
}

/**
 * POST /batches/{id}/settle — re-price + discount + close the cycle + compute the doctor's share on
 * the settled numbers, in one transaction. Irreversible; freezes the batch's invoices.
 */
export async function settleBatch(
  client: AxiosInstance,
  batchId: string,
  body: BatchSettleRequest,
): Promise<IdentifierResponse> {
  const payload = BatchSettleRequestSchema.parse(body);
  const res = await client.post(`/batches/${batchId}/settle`, {
    ...payload,
    id: newGuidV7(),
    idempotencyKey: `settle-${batchId}`,
  });
  return IdentifierResponseSchema.parse(res.data);
}
