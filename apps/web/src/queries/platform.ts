import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError, PlatformAuthResponse, PlatformLoginRequest, ProvisionTenantRequest, TenantSummary } from "@vet/shared";

import {
  platformLogin,
  provision,
  reactivate,
  suspend,
  tenant as fetchTenant,
  tenants as fetchTenants,
} from "@/api/platform";
import { usePlatformAuthStore } from "@/stores/platformAuthStore";

/** Query keys are namespaced under `platform` so they never collide with tenant reads in the shared cache. */
const keys = {
  tenants: ["platform", "tenants"] as const,
  tenant: (id: string) => ["platform", "tenant", id] as const,
};

/** POST /platform/auth/login — on success, establish the platform session (the guard then admits). */
export function usePlatformLogin() {
  const setSession = usePlatformAuthStore((s) => s.setSession);
  return useMutation<PlatformAuthResponse, ApiError, PlatformLoginRequest>({
    mutationFn: platformLogin,
    onSuccess: (res) => setSession(res),
  });
}

/** GET /platform/tenants — every center with its user count (no pagination; the list is small). */
export function useTenants() {
  return useQuery<TenantSummary[], ApiError>({ queryKey: keys.tenants, queryFn: fetchTenants });
}

/** GET /platform/tenants/{id} — one center. */
export function useTenant(id: string | null) {
  return useQuery<TenantSummary, ApiError>({
    queryKey: keys.tenant(id ?? ""),
    queryFn: () => fetchTenant(id as string),
    enabled: !!id,
  });
}

export function useProvisionTenant() {
  const qc = useQueryClient();
  return useMutation<TenantSummary, ApiError, ProvisionTenantRequest>({
    mutationFn: provision,
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.tenants }),
  });
}

export function useSuspendTenant() {
  const qc = useQueryClient();
  return useMutation<TenantSummary, ApiError, string>({
    mutationFn: suspend,
    onSuccess: (updated) => {
      qc.setQueryData(keys.tenant(updated.id), updated);
      void qc.invalidateQueries({ queryKey: keys.tenants });
    },
  });
}

export function useReactivateTenant() {
  const qc = useQueryClient();
  return useMutation<TenantSummary, ApiError, string>({
    mutationFn: reactivate,
    onSuccess: (updated) => {
      qc.setQueryData(keys.tenant(updated.id), updated);
      void qc.invalidateQueries({ queryKey: keys.tenants });
    },
  });
}
