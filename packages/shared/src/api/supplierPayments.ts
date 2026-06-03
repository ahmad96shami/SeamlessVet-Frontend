import type { AxiosInstance } from "axios";
import { z } from "zod";

import { idempotencyKey, newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  SupplierPaymentRequestSchema,
  SupplierPaymentResponseSchema,
  type SupplierPaymentInput,
  type SupplierPaymentListParams,
  type SupplierPaymentResponse,
} from "../schemas/supplierPayments";

const SupplierPaymentListSchema = z.array(SupplierPaymentResponseSchema);

// M19 supplier payments are online-only center-web. Recording one mints the GUID v7 `id` + one
// idempotency key, sent in the body (row-level dedup); the host apiClient injects the
// `Idempotency-Key` header (request-level dedup) on POST. The supplier is taken from the route.

/** GET /suppliers/{supplierId}/payments — a supplier's payment history, offset-paged. */
export async function listSupplierPayments(
  client: AxiosInstance,
  supplierId: string,
  params?: SupplierPaymentListParams,
): Promise<SupplierPaymentResponse[]> {
  const res = await client.get(`/suppliers/${supplierId}/payments`, { params });
  return SupplierPaymentListSchema.parse(res.data);
}

/**
 * POST /suppliers/{supplierId}/payments — record a payment to a supplier; posts a `payment` ledger
 * entry that reduces the supplier balance. A `cheque` payment settles immediately and stores its
 * optional reference metadata. Returns only `{ id }`.
 */
export async function recordSupplierPayment(
  client: AxiosInstance,
  supplierId: string,
  input: SupplierPaymentInput,
): Promise<IdentifierResponse> {
  const body = SupplierPaymentRequestSchema.parse({
    ...input,
    id: newGuidV7(),
    idempotencyKey: idempotencyKey(),
  });
  const res = await client.post(`/suppliers/${supplierId}/payments`, body);
  return IdentifierResponseSchema.parse(res.data);
}
