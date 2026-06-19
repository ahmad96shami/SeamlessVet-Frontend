import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRole,
  deleteRole,
  getPermissionCatalog,
  listRoles,
  updateRole,
  type ApiError,
  type CreateRoleRequest,
  type PermissionCatalogItem,
  type RoleListItem,
  type UpdateRoleRequest,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const ROLES = "roles";
const PERMISSIONS = "permissions-catalog";

export function useRoles(enabled = true) {
  return useQuery<RoleListItem[], ApiError>({
    queryKey: [ROLES],
    queryFn: () => listRoles(apiClient),
    enabled,
  });
}

export function usePermissionCatalog(enabled = true) {
  return useQuery<PermissionCatalogItem[], ApiError>({
    queryKey: [PERMISSIONS],
    queryFn: () => getPermissionCatalog(apiClient),
    enabled,
    staleTime: 5 * 60_000, // the catalog rarely changes
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation<RoleListItem, ApiError, CreateRoleRequest>({
    mutationFn: (body) => createRole(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ROLES] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation<RoleListItem, ApiError, { id: string; body: UpdateRoleRequest }>({
    mutationFn: ({ id, body }) => updateRole(apiClient, id, body),
    onSuccess: () => {
      // A built-in role's permissions changing affects users' gating — also refresh the roster.
      void qc.invalidateQueries({ queryKey: [ROLES] });
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteRole(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ROLES] }),
  });
}
