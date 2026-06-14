import {
  fetchTenant,
  fetchTenants,
  platformLogin as sharedPlatformLogin,
  provisionTenant,
  reactivateTenant,
  suspendTenant,
  type PlatformAuthResponse,
  type PlatformLoginRequest,
  type ProvisionTenantRequest,
  type TenantSummary,
} from "@vet/shared";

import { platformApiClient } from "@/services/platformApiClient";

/** The platform-console API surface (M35), bound to the dedicated {@link platformApiClient}. */

export const platformLogin = (body: PlatformLoginRequest): Promise<PlatformAuthResponse> =>
  sharedPlatformLogin(platformApiClient, body);

export const tenants = (): Promise<TenantSummary[]> => fetchTenants(platformApiClient);

export const tenant = (id: string): Promise<TenantSummary> => fetchTenant(platformApiClient, id);

export const provision = (body: ProvisionTenantRequest): Promise<TenantSummary> =>
  provisionTenant(platformApiClient, body);

export const suspend = (id: string): Promise<TenantSummary> => suspendTenant(platformApiClient, id);

export const reactivate = (id: string): Promise<TenantSummary> =>
  reactivateTenant(platformApiClient, id);
