import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  SupplierStatementResponseSchema,
  type SupplierStatementParams,
  type SupplierStatementResponse,
} from "../schemas/supplierLedgers";
import {
  SupplierRequestSchema,
  SupplierResponseSchema,
  type SupplierListParams,
  type SupplierRequest,
  type SupplierResponse,
} from "../schemas/suppliers";

const SupplierListSchema = z.array(SupplierResponseSchema);

// M19 suppliers are online-only center-web (no sync scope). Mutations carry the `Idempotency-Key`
// header automatically (the host apiClient injects it on POST/PATCH/DELETE); the wrapper mints the
// client GUID v7 `id` so screens never handle ids — the customers convention.

/** GET /suppliers — offset-paged roster; filters search / ledgerStatus. */
export async function listSuppliers(
  client: AxiosInstance,
  params?: SupplierListParams,
): Promise<SupplierResponse[]> {
  const res = await client.get("/suppliers", { params });
  return SupplierListSchema.parse(res.data);
}

/** GET /suppliers/{id} — single supplier (enriched with balance + ledgerStatus). */
export async function getSupplier(client: AxiosInstance, id: string): Promise<SupplierResponse> {
  const res = await client.get(`/suppliers/${id}`);
  return SupplierResponseSchema.parse(res.data);
}

/** POST /suppliers — create (mints a client GUID v7 id; the ledger is created server-side). */
export async function createSupplier(
  client: AxiosInstance,
  body: SupplierRequest,
): Promise<IdentifierResponse> {
  const payload = SupplierRequestSchema.parse(body);
  const res = await client.post("/suppliers", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /suppliers/{id} — partial update (`id` lives in the URL, never the body). */
export async function updateSupplier(
  client: AxiosInstance,
  id: string,
  body: SupplierRequest,
): Promise<IdentifierResponse> {
  const payload = SupplierRequestSchema.parse(body);
  const res = await client.patch(`/suppliers/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /suppliers/{id} — soft delete. */
export async function deleteSupplier(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/suppliers/${id}`);
}

/** GET /suppliers/{id}/statement — full supplier-ledger statement; optional `from`/`to` window. */
export async function getSupplierStatement(
  client: AxiosInstance,
  id: string,
  params?: SupplierStatementParams,
): Promise<SupplierStatementResponse> {
  const res = await client.get(`/suppliers/${id}/statement`, { params });
  return SupplierStatementResponseSchema.parse(res.data);
}
