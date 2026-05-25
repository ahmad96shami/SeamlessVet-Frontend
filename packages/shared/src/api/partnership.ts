import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  PartnerCreateRequestSchema,
  PartnerPatchRequestSchema,
  PartnerResponseSchema,
  PartnershipShareCreateRequestSchema,
  PartnershipSharePatchRequestSchema,
  PartnershipShareResponseSchema,
  type PartnerCreateRequest,
  type PartnerListParams,
  type PartnerPatchRequest,
  type PartnerResponse,
  type PartnershipShareCreateRequest,
  type PartnershipShareListParams,
  type PartnershipSharePatchRequest,
  type PartnershipShareResponse,
} from "../schemas/partnership";

const PartnerListSchema = z.array(PartnerResponseSchema);
const ShareListSchema = z.array(PartnershipShareResponseSchema);

// Partners + shares are Admin-only (`partnership.manage`) and exist **only in a `partnership`
// environment** — every endpoint (reads included) 404s in a `solo` one, so the web detects that and
// hides the surface. Mutations carry the auto-injected `Idempotency-Key`; creates mint the GUID v7 id.

// ---- Partners -------------------------------------------------------------

/** GET /partners — offset-paged. 404 in a solo environment. */
export async function listPartners(
  client: AxiosInstance,
  params?: PartnerListParams,
): Promise<PartnerResponse[]> {
  const res = await client.get("/partners", { params });
  return PartnerListSchema.parse(res.data);
}

/** GET /partners/{id}. */
export async function getPartner(client: AxiosInstance, id: string): Promise<PartnerResponse> {
  const res = await client.get(`/partners/${id}`);
  return PartnerResponseSchema.parse(res.data);
}

/** POST /partners — create. */
export async function createPartner(
  client: AxiosInstance,
  body: PartnerCreateRequest,
): Promise<IdentifierResponse> {
  const payload = PartnerCreateRequestSchema.parse(body);
  const res = await client.post("/partners", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /partners/{id} — edit (`id` in the URL). */
export async function updatePartner(
  client: AxiosInstance,
  id: string,
  body: PartnerPatchRequest,
): Promise<IdentifierResponse> {
  const payload = PartnerPatchRequestSchema.parse(body);
  const res = await client.patch(`/partners/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /partners/{id} — soft delete (cascades a soft-delete to the partner's live shares). */
export async function deletePartner(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/partners/${id}`);
}

// ---- Partnership shares ---------------------------------------------------

/** GET /partnership-shares — offset-paged; filters partnerId / activeOn. 404 in a solo environment. */
export async function listPartnershipShares(
  client: AxiosInstance,
  params?: PartnershipShareListParams,
): Promise<PartnershipShareResponse[]> {
  const res = await client.get("/partnership-shares", { params });
  return ShareListSchema.parse(res.data);
}

/** GET /partnership-shares/{id}. */
export async function getPartnershipShare(
  client: AxiosInstance,
  id: string,
): Promise<PartnershipShareResponse> {
  const res = await client.get(`/partnership-shares/${id}`);
  return PartnershipShareResponseSchema.parse(res.data);
}

/** POST /partnership-shares — create. Validates active shares sum ≤ 100% (409 on violation). */
export async function createPartnershipShare(
  client: AxiosInstance,
  body: PartnershipShareCreateRequest,
): Promise<IdentifierResponse> {
  const payload = PartnershipShareCreateRequestSchema.parse(body);
  const res = await client.post("/partnership-shares", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /partnership-shares/{id} — edit; re-validates the ≤100% invariant. */
export async function updatePartnershipShare(
  client: AxiosInstance,
  id: string,
  body: PartnershipSharePatchRequest,
): Promise<IdentifierResponse> {
  const payload = PartnershipSharePatchRequestSchema.parse(body);
  const res = await client.patch(`/partnership-shares/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /partnership-shares/{id} — soft delete. */
export async function deletePartnershipShare(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/partnership-shares/${id}`);
}
