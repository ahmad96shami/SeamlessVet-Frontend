import type { AxiosInstance } from "axios";
import { z } from "zod";

import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  ServiceRequestSchema,
  ServiceResponseSchema,
  type ServiceListParams,
  type ServiceRequest,
  type ServiceResponse,
} from "../schemas/services";

const ServiceListSchema = z.array(ServiceResponseSchema);

/** GET /admin/services — offset-paged, optional search / category filter. */
export async function listServices(
  client: AxiosInstance,
  params?: ServiceListParams,
): Promise<ServiceResponse[]> {
  const res = await client.get("/admin/services", { params });
  return ServiceListSchema.parse(res.data);
}

/** GET /admin/services/{id}. */
export async function getService(client: AxiosInstance, id: string): Promise<ServiceResponse> {
  const res = await client.get(`/admin/services/${id}`);
  return ServiceResponseSchema.parse(res.data);
}

/** POST /admin/services — create (send a client-generated GUID v7 `id`). Returns the new id. */
export async function createService(
  client: AxiosInstance,
  body: ServiceRequest,
): Promise<IdentifierResponse> {
  const payload = ServiceRequestSchema.parse(body);
  const res = await client.post("/admin/services", payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /admin/services/{id} — partial update (`id` lives in the URL, never the body). */
export async function updateService(
  client: AxiosInstance,
  id: string,
  body: ServiceRequest,
): Promise<IdentifierResponse> {
  const payload = ServiceRequestSchema.parse(body);
  const res = await client.patch(`/admin/services/${id}`, { ...payload, id: undefined });
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /admin/services/{id} — soft delete. */
export async function deleteService(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/admin/services/${id}`);
}
