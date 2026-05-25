import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  ProcedureCreateRequestSchema,
  ProcedurePatchRequestSchema,
  ProcedureResponseSchema,
  type ProcedureCreateRequest,
  type ProcedureListParams,
  type ProcedurePatchRequest,
  type ProcedureResponse,
} from "../schemas/procedures";

const ProcedureListSchema = z.array(ProcedureResponseSchema);

/** GET /procedures — offset-paged; filter by visitId. */
export async function listProcedures(
  client: AxiosInstance,
  params?: ProcedureListParams,
): Promise<ProcedureResponse[]> {
  const res = await client.get("/procedures", { params });
  return ProcedureListSchema.parse(res.data);
}

/** POST /procedures — create (mints a client GUID v7 id; price snapshots the service price). */
export async function createProcedure(
  client: AxiosInstance,
  body: ProcedureCreateRequest,
): Promise<IdentifierResponse> {
  const payload = ProcedureCreateRequestSchema.parse(body);
  const res = await client.post("/procedures", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /procedures/{id} — partial update. */
export async function updateProcedure(
  client: AxiosInstance,
  id: string,
  body: ProcedurePatchRequest,
): Promise<IdentifierResponse> {
  const payload = ProcedurePatchRequestSchema.parse(body);
  const res = await client.patch(`/procedures/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /procedures/{id} — soft delete. */
export async function deleteProcedure(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/procedures/${id}`);
}
