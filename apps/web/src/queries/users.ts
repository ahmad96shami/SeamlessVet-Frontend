import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addPermissionOverride,
  createUser,
  deactivateUser,
  getUser,
  listUsers,
  reactivateUser,
  updateUser,
  type ApiError,
  type CreateUserRequest,
  type PermissionOverrideRequest,
  type UpdateUserRequest,
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

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation<UserResponse, ApiError, CreateUserRequest>({
    mutationFn: (body) => createUser(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation<UserResponse, ApiError, { id: string; body: UpdateUserRequest }>({
    mutationFn: ({ id, body }) => updateUser(apiClient, id, body),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: [USERS] });
      void qc.invalidateQueries({ queryKey: [USER, id] });
    },
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
