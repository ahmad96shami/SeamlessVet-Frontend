import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  FarmRequestSchema,
  FarmResponseSchema,
  type FarmListParams,
  type FarmRequest,
  type FarmResponse,
} from "../schemas/farms";

const FarmListSchema = z.array(FarmResponseSchema);

// Mutations carry the `Idempotency-Key` header automatically (host apiClient); the create wrapper
// mints the client GUID v7 `id`. Farms are attached to a customer like pets and share the customer's
// permission scope; ledger ownership stays single-ledger this milestone (per-farm ledgers land in M16).

/** GET /farms — offset-paged; filter by customerId and/or search (name / location). */
export async function listFarms(client: AxiosInstance, params?: FarmListParams): Promise<FarmResponse[]> {
  const res = await client.get("/farms", { params });
  return FarmListSchema.parse(res.data);
}

/** GET /farms/{id}. */
export async function getFarm(client: AxiosInstance, id: string): Promise<FarmResponse> {
  const res = await client.get(`/farms/${id}`);
  return FarmResponseSchema.parse(res.data);
}

/** POST /farms — create under a customer (mints a client GUID v7 id). */
export async function createFarm(
  client: AxiosInstance,
  body: FarmRequest,
): Promise<IdentifierResponse> {
  const payload = FarmRequestSchema.parse(body);
  const res = await client.post("/farms", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/**
 * PATCH /farms/{id} — partial update. The body's `customerId` is ignored server-side
 * (FarmPatchRequest has no such field), so the full payload is safe.
 */
export async function updateFarm(
  client: AxiosInstance,
  id: string,
  body: FarmRequest,
): Promise<IdentifierResponse> {
  const payload = FarmRequestSchema.parse(body);
  const res = await client.patch(`/farms/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /farms/{id} — soft delete. */
export async function deleteFarm(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/farms/${id}`);
}
