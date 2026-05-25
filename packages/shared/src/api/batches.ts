import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  BatchCreateRequestSchema,
  BatchPatchRequestSchema,
  BatchResponseSchema,
  type BatchCreateRequest,
  type BatchListParams,
  type BatchPatchRequest,
  type BatchResponse,
} from "../schemas/batches";

const BatchListSchema = z.array(BatchResponseSchema);

// Mutations carry the `Idempotency-Key` header automatically (the host apiClient injects it on
// POST/PATCH/DELETE); the create wrapper mints the client GUID v7 `id`. Batch financial config is
// Admin/Accountant + online-only (gated on `contracts.activate`; server-authoritative on the sync path).

/** GET /batches — offset-paged; filters customerId / responsibleDoctorId / contractId / status. */
export async function listBatches(
  client: AxiosInstance,
  params?: BatchListParams,
): Promise<BatchResponse[]> {
  const res = await client.get("/batches", { params });
  return BatchListSchema.parse(res.data);
}

/** GET /batches/{id} — a single batch. */
export async function getBatch(client: AxiosInstance, id: string): Promise<BatchResponse> {
  const res = await client.get(`/batches/${id}`);
  return BatchResponseSchema.parse(res.data);
}

/** POST /batches — create a supervision batch (fee model, share %, ceiling, entitlement toggle). */
export async function createBatch(
  client: AxiosInstance,
  body: BatchCreateRequest,
): Promise<IdentifierResponse> {
  const payload = BatchCreateRequestSchema.parse(body);
  const res = await client.post("/batches", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /batches/{id} — edit config (`id` lives in the URL); status → `closed` computes entitlements. */
export async function updateBatch(
  client: AxiosInstance,
  id: string,
  body: BatchPatchRequest,
): Promise<IdentifierResponse> {
  const payload = BatchPatchRequestSchema.parse(body);
  const res = await client.patch(`/batches/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /batches/{id} — soft delete. */
export async function deleteBatch(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/batches/${id}`);
}
