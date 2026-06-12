import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  EmployeeStatementResponseSchema,
  type EmployeeStatementParams,
  type EmployeeStatementResponse,
} from "../schemas/employeeLedgers";
import {
  EmployeeCreateRequestSchema,
  EmployeePatchRequestSchema,
  EmployeeResponseSchema,
  type EmployeeCreateRequest,
  type EmployeeListParams,
  type EmployeePatchRequest,
  type EmployeeResponse,
} from "../schemas/employees";

const EmployeeListSchema = z.array(EmployeeResponseSchema);

// M31 employees are online-only center-web (no sync scope). Mutations carry the `Idempotency-Key`
// header automatically (the host apiClient injects it on POST/PATCH/DELETE); the create wrapper mints
// the client GUID v7 `id` so screens never handle ids — the suppliers / doctor-partners convention.

/** GET /employees — offset-paged roster; filters search (name) / ledgerStatus / active. */
export async function listEmployees(
  client: AxiosInstance,
  params?: EmployeeListParams,
): Promise<EmployeeResponse[]> {
  const res = await client.get("/employees", { params });
  return EmployeeListSchema.parse(res.data);
}

/** GET /employees/{id} — single employee (enriched with balance + ledgerStatus). */
export async function getEmployee(client: AxiosInstance, id: string): Promise<EmployeeResponse> {
  const res = await client.get(`/employees/${id}`);
  return EmployeeResponseSchema.parse(res.data);
}

/** POST /employees — create (optional user link; mints a client GUID v7 id; ledger seeded server-side). */
export async function createEmployee(
  client: AxiosInstance,
  body: EmployeeCreateRequest,
): Promise<IdentifierResponse> {
  const payload = EmployeeCreateRequestSchema.parse(body);
  const res = await client.post("/employees", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /employees/{id} — edit terms (`id` lives in the URL; the user link is fixed on create). */
export async function updateEmployee(
  client: AxiosInstance,
  id: string,
  body: EmployeePatchRequest,
): Promise<IdentifierResponse> {
  const payload = EmployeePatchRequestSchema.parse(body);
  const res = await client.patch(`/employees/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /employees/{id} — soft delete. */
export async function deleteEmployee(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/employees/${id}`);
}

/** GET /employees/{id}/statement — full employee-ledger statement; optional `from`/`to` window. */
export async function getEmployeeStatement(
  client: AxiosInstance,
  id: string,
  params?: EmployeeStatementParams,
): Promise<EmployeeStatementResponse> {
  const res = await client.get(`/employees/${id}/statement`, { params });
  return EmployeeStatementResponseSchema.parse(res.data);
}
