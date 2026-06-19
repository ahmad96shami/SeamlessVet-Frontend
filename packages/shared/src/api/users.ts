import type { AxiosInstance } from "axios";
import { z } from "zod";

import {
  CreateUserRequestSchema,
  PermissionOverrideRequestSchema,
  UpdateUserRequestSchema,
  UserDetailResponseSchema,
  UserResponseSchema,
  type CreateUserRequest,
  type PermissionOverrideRequest,
  type UpdateUserRequest,
  type UserDetailResponse,
  type UserListParams,
  type UserResponse,
} from "../schemas/users";

const UserListSchema = z.array(UserResponseSchema);

/** GET /admin/users — offset-paged roster with optional search / role / status filters. */
export async function listUsers(
  client: AxiosInstance,
  params?: UserListParams,
): Promise<UserResponse[]> {
  const res = await client.get("/admin/users", { params });
  return UserListSchema.parse(res.data);
}

/** GET /admin/users/{id} — single user + their permission overrides. */
export async function getUser(client: AxiosInstance, id: string): Promise<UserDetailResponse> {
  const res = await client.get(`/admin/users/${id}`);
  return UserDetailResponseSchema.parse(res.data);
}

/** POST /admin/users — admin-created staff account; active immediately (no approval round-trip). */
export async function createUser(
  client: AxiosInstance,
  body: CreateUserRequest,
): Promise<UserResponse> {
  const payload = CreateUserRequestSchema.parse(body);
  const res = await client.post("/admin/users", payload);
  return UserResponseSchema.parse(res.data);
}

/** PATCH /admin/users/{id} — edit an existing user's profile and role (`id` lives in the URL). */
export async function updateUser(
  client: AxiosInstance,
  id: string,
  body: UpdateUserRequest,
): Promise<UserResponse> {
  const payload = UpdateUserRequestSchema.parse(body);
  const res = await client.patch(`/admin/users/${id}`, payload);
  return UserResponseSchema.parse(res.data);
}

/** POST /admin/users/{id}/deactivate — suspends an active account. */
export async function deactivateUser(client: AxiosInstance, id: string): Promise<void> {
  await client.post(`/admin/users/${id}/deactivate`);
}

/** POST /admin/users/{id}/reactivate — reactivates a suspended account. */
export async function reactivateUser(client: AxiosInstance, id: string): Promise<void> {
  await client.post(`/admin/users/${id}/reactivate`);
}

/** POST /admin/users/{id}/permission-overrides — grant/deny a permission (busts the resolver cache). */
export async function addPermissionOverride(
  client: AxiosInstance,
  id: string,
  body: PermissionOverrideRequest,
): Promise<void> {
  const payload = PermissionOverrideRequestSchema.parse(body);
  await client.post(`/admin/users/${id}/permission-overrides`, payload);
}
