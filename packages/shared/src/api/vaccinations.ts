import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  VaccinationCreateRequestSchema,
  VaccinationPatchRequestSchema,
  VaccinationResponseSchema,
  type VaccinationCreateRequest,
  type VaccinationListParams,
  type VaccinationPatchRequest,
  type VaccinationResponse,
} from "../schemas/vaccinations";

const VaccinationListSchema = z.array(VaccinationResponseSchema);

/** GET /vaccinations — offset-paged; filter by petId / customerId / visitId. */
export async function listVaccinations(
  client: AxiosInstance,
  params?: VaccinationListParams,
): Promise<VaccinationResponse[]> {
  const res = await client.get("/vaccinations", { params });
  return VaccinationListSchema.parse(res.data);
}

/** POST /vaccinations — create (mints a client GUID v7 id). */
export async function createVaccination(
  client: AxiosInstance,
  body: VaccinationCreateRequest,
): Promise<IdentifierResponse> {
  const payload = VaccinationCreateRequestSchema.parse(body);
  const res = await client.post("/vaccinations", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /vaccinations/{id} — partial update. */
export async function updateVaccination(
  client: AxiosInstance,
  id: string,
  body: VaccinationPatchRequest,
): Promise<IdentifierResponse> {
  const payload = VaccinationPatchRequestSchema.parse(body);
  const res = await client.patch(`/vaccinations/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /vaccinations/{id} — soft delete. */
export async function deleteVaccination(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/vaccinations/${id}`);
}
