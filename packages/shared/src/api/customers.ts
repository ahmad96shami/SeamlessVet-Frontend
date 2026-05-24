import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  CustomerRequestSchema,
  CustomerResponseSchema,
  type CustomerListParams,
  type CustomerRequest,
  type CustomerResponse,
} from "../schemas/customers";
import {
  StatementResponseSchema,
  type StatementParams,
  type StatementResponse,
} from "../schemas/ledgers";

const CustomerListSchema = z.array(CustomerResponseSchema);

// Mutations carry the `Idempotency-Key` header automatically (the host apiClient injects it on
// POST/PATCH/DELETE); the wrapper mints the client GUID v7 `id` so screens never handle ids.

/** GET /customers — offset-paged roster; filters search / type / assignedDoctorId / ledgerStatus. */
export async function listCustomers(
  client: AxiosInstance,
  params?: CustomerListParams,
): Promise<CustomerResponse[]> {
  const res = await client.get("/customers", { params });
  return CustomerListSchema.parse(res.data);
}

/** GET /customers/{id} — single customer (enriched with balance + ledgerStatus). */
export async function getCustomer(client: AxiosInstance, id: string): Promise<CustomerResponse> {
  const res = await client.get(`/customers/${id}`);
  return CustomerResponseSchema.parse(res.data);
}

/** POST /customers — create (mints a client GUID v7 id; the ledger is created server-side). */
export async function createCustomer(
  client: AxiosInstance,
  body: CustomerRequest,
): Promise<IdentifierResponse> {
  const payload = CustomerRequestSchema.parse(body);
  const res = await client.post("/customers", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /customers/{id} — partial update (`id` lives in the URL, never the body). */
export async function updateCustomer(
  client: AxiosInstance,
  id: string,
  body: CustomerRequest,
): Promise<IdentifierResponse> {
  const payload = CustomerRequestSchema.parse(body);
  const res = await client.patch(`/customers/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /customers/{id} — soft delete. */
export async function deleteCustomer(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/customers/${id}`);
}

/** GET /customers/{id}/statement — full ledger statement; optional `from`/`to` window. */
export async function getStatement(
  client: AxiosInstance,
  id: string,
  params?: StatementParams,
): Promise<StatementResponse> {
  const res = await client.get(`/customers/${id}/statement`, { params });
  return StatementResponseSchema.parse(res.data);
}
