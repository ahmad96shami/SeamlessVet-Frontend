import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  DoctorPartnerStatementResponseSchema,
  type DoctorPartnerStatementParams,
  type DoctorPartnerStatementResponse,
} from "../schemas/doctorPartnerLedgers";
import {
  DoctorPartnerCreateRequestSchema,
  DoctorPartnerPatchRequestSchema,
  DoctorPartnerResponseSchema,
  type DoctorPartnerCreateRequest,
  type DoctorPartnerListParams,
  type DoctorPartnerPatchRequest,
  type DoctorPartnerResponse,
} from "../schemas/doctorPartners";

const DoctorPartnerListSchema = z.array(DoctorPartnerResponseSchema);

// M30 doctor-partners are online-only center-web (no sync scope). Mutations carry the `Idempotency-Key`
// header automatically (the host apiClient injects it on POST/PATCH/DELETE); the create wrapper mints
// the client GUID v7 `id` so screens never handle ids — the suppliers convention.

/** GET /doctor-partners — offset-paged roster; filters search (doctor name) / ledgerStatus. */
export async function listDoctorPartners(
  client: AxiosInstance,
  params?: DoctorPartnerListParams,
): Promise<DoctorPartnerResponse[]> {
  const res = await client.get("/doctor-partners", { params });
  return DoctorPartnerListSchema.parse(res.data);
}

/** GET /doctor-partners/{id} — single partner (enriched with doctorName + balance + ledgerStatus). */
export async function getDoctorPartner(
  client: AxiosInstance,
  id: string,
): Promise<DoctorPartnerResponse> {
  const res = await client.get(`/doctor-partners/${id}`);
  return DoctorPartnerResponseSchema.parse(res.data);
}

/** POST /doctor-partners — create with a mandatory user link (mints a client GUID v7 id; ledger seeded server-side). */
export async function createDoctorPartner(
  client: AxiosInstance,
  body: DoctorPartnerCreateRequest,
): Promise<IdentifierResponse> {
  const payload = DoctorPartnerCreateRequestSchema.parse(body);
  const res = await client.post("/doctor-partners", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /doctor-partners/{id} — edit notes only (`id` lives in the URL; the user link is fixed). */
export async function updateDoctorPartner(
  client: AxiosInstance,
  id: string,
  body: DoctorPartnerPatchRequest,
): Promise<IdentifierResponse> {
  const payload = DoctorPartnerPatchRequestSchema.parse(body);
  const res = await client.patch(`/doctor-partners/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /doctor-partners/{id} — soft delete. */
export async function deleteDoctorPartner(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/doctor-partners/${id}`);
}

/** GET /doctor-partners/{id}/statement — full doctor-partner-ledger statement; optional `from`/`to` window. */
export async function getDoctorPartnerStatement(
  client: AxiosInstance,
  id: string,
  params?: DoctorPartnerStatementParams,
): Promise<DoctorPartnerStatementResponse> {
  const res = await client.get(`/doctor-partners/${id}/statement`, { params });
  return DoctorPartnerStatementResponseSchema.parse(res.data);
}
