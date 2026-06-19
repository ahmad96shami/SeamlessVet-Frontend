import { z } from "zod";

/**
 * A role in the admin Roles tab (GET /admin/roles). `isBuiltIn` marks the eight seeded RoleKey values —
 * those can have their permissions edited but cannot be deleted; the `admin` role is fully protected.
 * `permissions` is the role's current set of permission keys.
 */
export const RoleListItemSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  isBuiltIn: z.boolean(),
  userCount: z.number(),
  permissions: z.array(z.string()),
});
export type RoleListItem = z.infer<typeof RoleListItemSchema>;

/** An entry in the permission catalog (GET /admin/permissions) used to build the role editor. */
export const PermissionCatalogItemSchema = z.object({
  key: z.string(),
  description: z.string().nullish(),
});
export type PermissionCatalogItem = z.infer<typeof PermissionCatalogItemSchema>;

/** POST /admin/roles — create a custom role (server generates the key). */
export const CreateRoleRequestSchema = z.object({
  name: z.string().trim().min(1).max(64),
  permissions: z.array(z.string()),
});
export type CreateRoleRequest = z.infer<typeof CreateRoleRequestSchema>;

/** PATCH /admin/roles/{id} — rename + replace the role's full permission set. */
export const UpdateRoleRequestSchema = z.object({
  name: z.string().trim().min(1).max(64),
  permissions: z.array(z.string()),
});
export type UpdateRoleRequest = z.infer<typeof UpdateRoleRequestSchema>;
