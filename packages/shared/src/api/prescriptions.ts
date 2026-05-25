import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  PrescriptionCreateRequestSchema,
  PrescriptionPatchRequestSchema,
  PrescriptionResponseSchema,
  type PrescriptionCreateRequest,
  type PrescriptionListParams,
  type PrescriptionPatchRequest,
  type PrescriptionResponse,
} from "../schemas/prescriptions";

const PrescriptionListSchema = z.array(PrescriptionResponseSchema);

/** GET /prescriptions — offset-paged; filter by visitId. */
export async function listPrescriptions(
  client: AxiosInstance,
  params?: PrescriptionListParams,
): Promise<PrescriptionResponse[]> {
  const res = await client.get("/prescriptions", { params });
  return PrescriptionListSchema.parse(res.data);
}

/**
 * POST /prescriptions — create (mints a client GUID v7 id). An `administered_in_clinic` script
 * atomically deducts `quantity` from inventory server-side; `dispensed_to_owner` is billed at POS.
 */
export async function createPrescription(
  client: AxiosInstance,
  body: PrescriptionCreateRequest,
): Promise<IdentifierResponse> {
  const payload = PrescriptionCreateRequestSchema.parse(body);
  const res = await client.post("/prescriptions", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /prescriptions/{id} — edits advisory text only (product/qty/dispense type immutable). */
export async function updatePrescription(
  client: AxiosInstance,
  id: string,
  body: PrescriptionPatchRequest,
): Promise<IdentifierResponse> {
  const payload = PrescriptionPatchRequestSchema.parse(body);
  const res = await client.patch(`/prescriptions/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /prescriptions/{id} — soft delete (inventory is not auto-reversed). */
export async function deletePrescription(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/prescriptions/${id}`);
}
