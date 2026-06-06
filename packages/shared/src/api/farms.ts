import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import {
  CloseAccountResponseSchema,
  type CloseAccountResponse,
} from "../schemas/entitlements";
import {
  FarmRequestSchema,
  FarmResponseSchema,
  type FarmListParams,
  type FarmRequest,
  type FarmResponse,
} from "../schemas/farms";
import {
  StatementResponseSchema,
  type StatementParams,
  type StatementResponse,
} from "../schemas/ledgers";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";

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

/**
 * GET /farms/{id}/statement (M16) — the farm ledger's statement; optional `from`/`to` window. Same
 * shape as the customer statement: the owning customer rides in `customerId`/`customerName` and the
 * farm in `farmId`/`farmName`. Ready for WhatsApp/email/print.
 */
export async function getFarmStatement(
  client: AxiosInstance,
  id: string,
  params?: StatementParams,
): Promise<StatementResponse> {
  const res = await client.get(`/farms/${id}/statement`, { params });
  return StatementResponseSchema.parse(res.data);
}

/**
 * POST /farms/{id}/close-account (M16) — close the farm's account (zero-balance only) and compute its
 * entitlements. Rejects with 409 `account_not_settled` if the farm ledger isn't fully paid. Closing
 * one farm leaves the owning customer and its other farms open. Carries the auto-injected
 * `Idempotency-Key`; payout authority (`entitlements.approve`).
 */
export async function closeFarmAccount(
  client: AxiosInstance,
  id: string,
): Promise<CloseAccountResponse> {
  const res = await client.post(`/farms/${id}/close-account`);
  return CloseAccountResponseSchema.parse(res.data);
}

/**
 * POST /farms/{id}/reopen-account (M16) — lift the settlement lock on a closed farm ledger so its new
 * visits can be billed. Idempotent; payout authority (`entitlements.approve`).
 */
export async function reopenFarmAccount(
  client: AxiosInstance,
  id: string,
): Promise<CloseAccountResponse> {
  const res = await client.post(`/farms/${id}/reopen-account`);
  return CloseAccountResponseSchema.parse(res.data);
}
