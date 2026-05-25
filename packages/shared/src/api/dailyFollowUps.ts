import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  DailyFollowUpCreateRequestSchema,
  DailyFollowUpPatchRequestSchema,
  DailyFollowUpResponseSchema,
  type DailyFollowUpCreateRequest,
  type DailyFollowUpListParams,
  type DailyFollowUpPatchRequest,
  type DailyFollowUpResponse,
} from "../schemas/dailyFollowUps";

const DailyFollowUpListSchema = z.array(DailyFollowUpResponseSchema);

/** GET /daily-follow-ups — offset-paged; filter by visitId. */
export async function listDailyFollowUps(
  client: AxiosInstance,
  params?: DailyFollowUpListParams,
): Promise<DailyFollowUpResponse[]> {
  const res = await client.get("/daily-follow-ups", { params });
  return DailyFollowUpListSchema.parse(res.data);
}

/** POST /daily-follow-ups — create (mints a client GUID v7 id; clinic visits only, server-enforced). */
export async function createDailyFollowUp(
  client: AxiosInstance,
  body: DailyFollowUpCreateRequest,
): Promise<IdentifierResponse> {
  const payload = DailyFollowUpCreateRequestSchema.parse(body);
  const res = await client.post("/daily-follow-ups", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /daily-follow-ups/{id} — partial update. */
export async function updateDailyFollowUp(
  client: AxiosInstance,
  id: string,
  body: DailyFollowUpPatchRequest,
): Promise<IdentifierResponse> {
  const payload = DailyFollowUpPatchRequestSchema.parse(body);
  const res = await client.patch(`/daily-follow-ups/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /daily-follow-ups/{id} — soft delete. */
export async function deleteDailyFollowUp(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/daily-follow-ups/${id}`);
}
