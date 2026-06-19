import { z } from "zod";

/** A row in the admin user roster (GET /admin/users) — never includes the password hash. */
export const UserResponseSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phonePrimary: z.string(),
  email: z.string().nullish(),
  roleKey: z.string(),
  roleName: z.string(),
  status: z.string(),
  numberPrefix: z.string().nullish(),
  licenseNumber: z.string().nullish(),
  createdAt: z.string(),
});
export type UserResponse = z.infer<typeof UserResponseSchema>;

/** One permission override on a user (grant/deny layered on top of the role defaults). */
export const UserPermissionOverrideItemSchema = z.object({
  permissionKey: z.string(),
  effect: z.string(),
});
export type UserPermissionOverrideItem = z.infer<typeof UserPermissionOverrideItemSchema>;

/** Single user + their permission overrides (GET /admin/users/{id}) — feeds the override editor. */
export const UserDetailResponseSchema = UserResponseSchema.extend({
  licenseDetails: z.string().nullish(),
  permissionOverrides: z.array(UserPermissionOverrideItemSchema),
});
export type UserDetailResponse = z.infer<typeof UserDetailResponseSchema>;

/** POST /admin/users/{id}/permission-overrides body. `effect` mirrors the OverrideEffect enum. */
export const PermissionOverrideRequestSchema = z.object({
  permissionKey: z.string().min(1),
  effect: z.enum(["grant", "deny"]),
});
export type PermissionOverrideRequest = z.infer<typeof PermissionOverrideRequestSchema>;

/**
 * POST /admin/users body — an admin-created staff account (cashier, in-clinic doctor, …) that
 * skips the self-registration approval queue and is active immediately.
 */
export const CreateUserRequestSchema = z.object({
  fullName: z.string().min(1).max(128),
  phonePrimary: z
    .string()
    .regex(/^\+?[0-9- ]{7,32}$/, "invalid_phone"),
  // `.or(z.literal(""))` keeps the RHF resolver happy on the untouched empty input —
  // the web form drops blanks at submit (omitEmptyStrings), so "" never reaches the API.
  email: z.string().email().max(255).optional().or(z.literal("")),
  password: z.string().min(8).max(128),
  roleKey: z.string().min(1),
  licenseNumber: z.string().max(64).optional(),
  licenseDetails: z.string().optional(),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

/**
 * PATCH /admin/users/{id} body — edit an existing user's profile and role. Mirrors the backend
 * UpdateUserRequest (no password — that's a separate reset flow). Changing `roleKey` re-resolves the
 * user's permissions on their next request.
 */
export const UpdateUserRequestSchema = z.object({
  fullName: z.string().min(1).max(128),
  phonePrimary: z.string().regex(/^\+?[0-9- ]{7,32}$/, "invalid_phone"),
  email: z.string().email().max(255).optional().or(z.literal("")),
  roleKey: z.string().min(1),
  licenseNumber: z.string().max(64).optional(),
  licenseDetails: z.string().optional(),
});
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

/** Query params for the roster list — offset-paged (admin-table convention). */
export interface UserListParams {
  search?: string;
  role?: string;
  status?: string;
  skip?: number;
  take?: number;
}
