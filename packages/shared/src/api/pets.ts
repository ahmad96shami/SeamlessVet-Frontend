import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  PetRequestSchema,
  PetResponseSchema,
  PetTimelineResponseSchema,
  PetTransferRequestSchema,
  type PetListParams,
  type PetRequest,
  type PetResponse,
  type PetTimelineParams,
  type PetTimelineResponse,
  type PetTransferRequest,
} from "../schemas/pets";

const PetListSchema = z.array(PetResponseSchema);

// Mutations carry the `Idempotency-Key` header automatically (host apiClient); the wrapper mints the
// client GUID v7 `id`.

/** GET /pets — offset-paged; filter by customerId and/or search (name / microchip). */
export async function listPets(client: AxiosInstance, params?: PetListParams): Promise<PetResponse[]> {
  const res = await client.get("/pets", { params });
  return PetListSchema.parse(res.data);
}

/** GET /pets/{id}. */
export async function getPet(client: AxiosInstance, id: string): Promise<PetResponse> {
  const res = await client.get(`/pets/${id}`);
  return PetResponseSchema.parse(res.data);
}

/** POST /pets — create under a customer (mints a client GUID v7 id). */
export async function createPet(
  client: AxiosInstance,
  body: PetRequest,
): Promise<IdentifierResponse> {
  const payload = PetRequestSchema.parse(body);
  const res = await client.post("/pets", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/**
 * PATCH /pets/{id} — partial update. The body's `customerId` is ignored server-side (PetPatchRequest
 * has no such field; ownership moves only via the transfer endpoint), so the full payload is safe.
 */
export async function updatePet(
  client: AxiosInstance,
  id: string,
  body: PetRequest,
): Promise<IdentifierResponse> {
  const payload = PetRequestSchema.parse(body);
  const res = await client.patch(`/pets/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /pets/{id} — soft delete. */
export async function deletePet(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/pets/${id}`);
}

/** POST /pets/{id}/transfer — move the pet to another owner. */
export async function transferPet(
  client: AxiosInstance,
  id: string,
  body: PetTransferRequest,
): Promise<IdentifierResponse> {
  const payload = PetTransferRequestSchema.parse(body);
  const res = await client.post(`/pets/${id}/transfer`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** GET /pets/{id}/timeline — chronological clinic + field medical history (M5 task 17). */
export async function getPetTimeline(
  client: AxiosInstance,
  id: string,
  params?: PetTimelineParams,
): Promise<PetTimelineResponse> {
  const res = await client.get(`/pets/${id}/timeline`, { params });
  return PetTimelineResponseSchema.parse(res.data);
}
