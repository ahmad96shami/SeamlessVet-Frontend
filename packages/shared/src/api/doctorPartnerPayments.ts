import type { AxiosInstance } from "axios";
import { z } from "zod";

import { idempotencyKey, newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  DoctorPartnerPaymentRequestSchema,
  DoctorPartnerPaymentResponseSchema,
  type DoctorPartnerPaymentInput,
  type DoctorPartnerPaymentListParams,
  type DoctorPartnerPaymentResponse,
} from "../schemas/doctorPartnerPayments";

const DoctorPartnerPaymentListSchema = z.array(DoctorPartnerPaymentResponseSchema);

// M30 doctor-partner payments are online-only center-web. Recording one mints the GUID v7 `id` + one
// idempotency key, sent in the body (row-level dedup); the host apiClient injects the `Idempotency-Key`
// header (request-level dedup) on POST. The partner is taken from the route.

/** GET /doctor-partners/{doctorPartnerId}/payments — a partner's payment history, offset-paged. */
export async function listDoctorPartnerPayments(
  client: AxiosInstance,
  doctorPartnerId: string,
  params?: DoctorPartnerPaymentListParams,
): Promise<DoctorPartnerPaymentResponse[]> {
  const res = await client.get(`/doctor-partners/${doctorPartnerId}/payments`, { params });
  return DoctorPartnerPaymentListSchema.parse(res.data);
}

/**
 * POST /doctor-partners/{doctorPartnerId}/payments — record a payment to a doctor-partner; posts a
 * `payment` ledger entry that reduces the partner balance. A `cheque` payment settles immediately and
 * stores its optional reference metadata. Returns only `{ id }`.
 */
export async function recordDoctorPartnerPayment(
  client: AxiosInstance,
  doctorPartnerId: string,
  input: DoctorPartnerPaymentInput,
): Promise<IdentifierResponse> {
  const body = DoctorPartnerPaymentRequestSchema.parse({
    ...input,
    id: newGuidV7(),
    idempotencyKey: idempotencyKey(),
  });
  const res = await client.post(`/doctor-partners/${doctorPartnerId}/payments`, body);
  return IdentifierResponseSchema.parse(res.data);
}
