import type { AxiosInstance } from "axios";
import { z } from "zod";

import {
  CreateRoleRequestSchema,
  PermissionCatalogItemSchema,
  RoleListItemSchema,
  UpdateRoleRequestSchema,
  type CreateRoleRequest,
  type PermissionCatalogItem,
  type RoleListItem,
  type UpdateRoleRequest,
} from "../schemas/roles";

const RoleListSchema = z.array(RoleListItemSchema);
const PermissionCatalogSchema = z.array(PermissionCatalogItemSchema);

// Roles + permission management (the admin Roles tab). Online-only center-web, gated on roles.manage.

/** GET /admin/roles — every role with its permission keys, built-in flag, and user count. */
export async function listRoles(client: AxiosInstance): Promise<RoleListItem[]> {
  const res = await client.get("/admin/roles");
  return RoleListSchema.parse(res.data);
}

/** GET /admin/permissions — the permission catalog (key + description) for the role editor. */
export async function getPermissionCatalog(client: AxiosInstance): Promise<PermissionCatalogItem[]> {
  const res = await client.get("/admin/permissions");
  return PermissionCatalogSchema.parse(res.data);
}

/** POST /admin/roles — create a custom role (the server generates the key). */
export async function createRole(
  client: AxiosInstance,
  body: CreateRoleRequest,
): Promise<RoleListItem> {
  const payload = CreateRoleRequestSchema.parse(body);
  const res = await client.post("/admin/roles", payload);
  return RoleListItemSchema.parse(res.data);
}

/** PATCH /admin/roles/{id} — rename + replace the role's permission set. */
export async function updateRole(
  client: AxiosInstance,
  id: string,
  body: UpdateRoleRequest,
): Promise<RoleListItem> {
  const payload = UpdateRoleRequestSchema.parse(body);
  const res = await client.patch(`/admin/roles/${id}`, payload);
  return RoleListItemSchema.parse(res.data);
}

/** DELETE /admin/roles/{id} — soft-delete a custom role (blocked for built-ins / in-use roles). */
export async function deleteRole(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/admin/roles/${id}`);
}
