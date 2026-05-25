import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  VisitCreateRequestSchema,
  VisitPatchRequestSchema,
  VisitResponseSchema,
  type VisitCreateRequest,
  type VisitListParams,
  type VisitPatchRequest,
  type VisitResponse,
} from "../schemas/visits";

const VisitListSchema = z.array(VisitResponseSchema);

// Mutations carry the `Idempotency-Key` header automatically (the host apiClient injects it on
// POST/PATCH); the create wrapper mints the client GUID v7 `id` so screens never handle ids.

/** GET /visits — offset-paged; filters customerId / petId / doctorId / status. */
export async function listVisits(
  client: AxiosInstance,
  params?: VisitListParams,
): Promise<VisitResponse[]> {
  const res = await client.get("/visits", { params });
  return VisitListSchema.parse(res.data);
}

/** GET /visits/{id} — a single visit with all clinical sections. */
export async function getVisit(client: AxiosInstance, id: string): Promise<VisitResponse> {
  const res = await client.get(`/visits/${id}`);
  return VisitResponseSchema.parse(res.data);
}

/** POST /visits — create (status defaults to `open`; `visit_number` left null server-side). */
export async function createVisit(
  client: AxiosInstance,
  body: VisitCreateRequest,
): Promise<IdentifierResponse> {
  const payload = VisitCreateRequestSchema.parse(body);
  const res = await client.post("/visits", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /visits/{id} — section-level update (non-terminal; `id` lives in the URL). */
export async function updateVisit(
  client: AxiosInstance,
  id: string,
  body: VisitPatchRequest,
): Promise<IdentifierResponse> {
  const payload = VisitPatchRequestSchema.parse(body);
  const res = await client.patch(`/visits/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** POST /visits/{id}/complete — terminal transition (idempotent); stamps `ended_at`. */
export async function completeVisit(client: AxiosInstance, id: string): Promise<IdentifierResponse> {
  const res = await client.post(`/visits/${id}/complete`);
  return IdentifierResponseSchema.parse(res.data);
}

/** POST /visits/{id}/cancel — terminal transition (idempotent); stamps `ended_at`. */
export async function cancelVisit(client: AxiosInstance, id: string): Promise<IdentifierResponse> {
  const res = await client.post(`/visits/${id}/cancel`);
  return IdentifierResponseSchema.parse(res.data);
}
