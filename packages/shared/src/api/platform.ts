import type { AxiosInstance } from "axios";

import {
  PlatformAuthResponseSchema,
  PlatformLoginRequestSchema,
  ProvisionTenantRequestSchema,
  TenantListResponseSchema,
  TenantSummarySchema,
  type PlatformAuthResponse,
  type PlatformLoginRequest,
  type ProvisionTenantRequest,
  type TenantSummary,
} from "../schemas/platform";

/**
 * Thin, Zod-validated wrappers for the platform super-admin console (M35). The host app passes a
 * DEDICATED `platformApiClient` (a separate token store from the tenant client) — these never run
 * against a tenant token, and a platform token never reaches a tenant endpoint. Every response is
 * re-validated because the spec declares no typed body (runtime drift guard at the realm boundary).
 */

/** POST /platform/auth/login — global phone + password → a platform-admin token (no refresh in v1). */
export async function platformLogin(
  client: AxiosInstance,
  body: PlatformLoginRequest,
): Promise<PlatformAuthResponse> {
  const payload = PlatformLoginRequestSchema.parse(body);
  const response = await client.post("/platform/auth/login", payload);
  return PlatformAuthResponseSchema.parse(response.data);
}

/** GET /platform/tenants — every center with its user count. */
export async function fetchTenants(client: AxiosInstance): Promise<TenantSummary[]> {
  const response = await client.get("/platform/tenants");
  return TenantListResponseSchema.parse(response.data).tenants;
}

/** GET /platform/tenants/{id} — one center. 404 when no such (non-deleted) center exists. */
export async function fetchTenant(client: AxiosInstance, id: string): Promise<TenantSummary> {
  const response = await client.get(`/platform/tenants/${id}`);
  return TenantSummarySchema.parse(response.data);
}

/** POST /platform/tenants — provision a new center + its first admin. 409 when the code is taken. */
export async function provisionTenant(
  client: AxiosInstance,
  body: ProvisionTenantRequest,
): Promise<TenantSummary> {
  const payload = ProvisionTenantRequestSchema.parse(body);
  // The backend reads `adminEmail` as nullable; never send an empty string.
  const response = await client.post("/platform/tenants", {
    ...payload,
    adminEmail: payload.adminEmail ? payload.adminEmail : null,
  });
  return TenantSummarySchema.parse(response.data);
}

/** POST /platform/tenants/{id}/suspend — locks the center's users out within one request. */
export async function suspendTenant(client: AxiosInstance, id: string): Promise<TenantSummary> {
  const response = await client.post(`/platform/tenants/${id}/suspend`);
  return TenantSummarySchema.parse(response.data);
}

/** POST /platform/tenants/{id}/reactivate — restores a suspended center. */
export async function reactivateTenant(client: AxiosInstance, id: string): Promise<TenantSummary> {
  const response = await client.post(`/platform/tenants/${id}/reactivate`);
  return TenantSummarySchema.parse(response.data);
}
