import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import {
  NightStayCloseRequestSchema,
  NightStayCreateRequestSchema,
  NightStayPatchRequestSchema,
  NightStayResponseSchema,
  type NightStayCloseRequest,
  type NightStayCreateRequest,
  type NightStayListParams,
  type NightStayPatchRequest,
  type NightStayResponse,
} from "../schemas/nightStays";

const NightStayListSchema = z.array(NightStayResponseSchema);

/** GET /night-stays — offset-paged; filter by visitId. */
export async function listNightStays(
  client: AxiosInstance,
  params?: NightStayListParams,
): Promise<NightStayResponse[]> {
  const res = await client.get("/night-stays", { params });
  return NightStayListSchema.parse(res.data);
}

/** GET /night-stays/{id}. */
export async function getNightStay(client: AxiosInstance, id: string): Promise<NightStayResponse> {
  const res = await client.get(`/night-stays/${id}`);
  return NightStayResponseSchema.parse(res.data);
}

/** POST /night-stays — opens a stay (mints a client GUID v7 id; clinic visits only, server-enforced). */
export async function createNightStay(
  client: AxiosInstance,
  body: NightStayCreateRequest,
): Promise<NightStayResponse> {
  const payload = NightStayCreateRequestSchema.parse(body);
  const res = await client.post("/night-stays", { ...payload, id: newGuidV7() });
  return NightStayResponseSchema.parse(res.data);
}

/** PATCH /night-stays/{id} — edit an open stay. */
export async function updateNightStay(
  client: AxiosInstance,
  id: string,
  body: NightStayPatchRequest,
): Promise<NightStayResponse> {
  const payload = NightStayPatchRequestSchema.parse(body);
  const res = await client.patch(`/night-stays/${id}`, payload);
  return NightStayResponseSchema.parse(res.data);
}

/** POST /night-stays/{id}/close — counts nights + posts the boarding charge. Idempotent. */
export async function closeNightStay(
  client: AxiosInstance,
  id: string,
  body?: NightStayCloseRequest,
): Promise<NightStayResponse> {
  const payload = NightStayCloseRequestSchema.parse(body ?? {});
  const res = await client.post(`/night-stays/${id}/close`, payload);
  return NightStayResponseSchema.parse(res.data);
}

/** DELETE /night-stays/{id} — soft delete (only before close). */
export async function deleteNightStay(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/night-stays/${id}`);
}
