import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addPermissionOverride,
  deactivateUser,
  getUser,
  listUsers,
  reactivateUser,
  type ApiError,
  type PermissionOverrideRequest,
  type UserDetailResponse,
  type UserListParams,
  type UserResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const USERS = "users";
const USER = "user";

export function useUsers(params: UserListParams) {
  return useQuery<UserResponse[], ApiError>({
    queryKey: [USERS, params],
    queryFn: () => listUsers(apiClient, params),
    placeholderData: (prev) => prev, // keep the current rows visible while paging/filtering
  });
}

export function useUserDetail(id: string | null) {
  return useQuery<UserDetailResponse, ApiError>({
    queryKey: [USER, id],
    queryFn: () => getUser(apiClient, id as string),
    enabled: id !== null,
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deactivateUser(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS] }),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => reactivateUser(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS] }),
  });
}

export function useAddPermissionOverride(userId: string | null) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, PermissionOverrideRequest>({
    mutationFn: (body) => addPermissionOverride(apiClient, userId as string, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [USER, userId] });
      void qc.invalidateQueries({ queryKey: [USERS] });
    },
  });
}
