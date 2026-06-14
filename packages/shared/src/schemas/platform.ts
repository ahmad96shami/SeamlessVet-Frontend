import { z } from "zod";

/**
 * Platform super-admin console (M35) — a realm OUTSIDE any tenant. A platform admin provisions and
 * suspends/reactivates centers; it carries no `environment_id` and never touches tenant data. The
 * `/platform/*` endpoints declare no typed 200 bodies in the OpenAPI spec (TypedResults.Ok), so —
 * exactly like `/auth/*` — these Zod schemas are the contract, verified against the live shapes.
 */

/** POST /platform/auth/login request — the platform realm has one global login (no tenant routing). */
export const PlatformLoginRequestSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});
export type PlatformLoginRequest = z.infer<typeof PlatformLoginRequestSchema>;

/**
 * POST /platform/auth/login response — a platform-admin access token (no refresh in v1; re-mint by
 * login). `fullName` powers the console header (the JWT carries no name claim).
 */
export const PlatformAuthResponseSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresAt: z.string(), // ISO-8601
  platformAdminId: z.string(),
  fullName: z.string(),
});
export type PlatformAuthResponse = z.infer<typeof PlatformAuthResponseSchema>;

/** A center as the platform console sees it (GET/POST /platform/tenants[/{id}]). */
export const TenantSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  mode: z.string(),
  status: z.string(),
  userCount: z.number(),
  createdAt: z.string(), // ISO-8601
});
export type TenantSummary = z.infer<typeof TenantSummarySchema>;

/** GET /platform/tenants response — every center the platform admin can see (no pagination). */
export const TenantListResponseSchema = z.object({
  tenants: z.array(TenantSummarySchema),
});
export type TenantListResponse = z.infer<typeof TenantListResponseSchema>;

/**
 * POST /platform/tenants request — provision a new center + its first admin (mirrors
 * components["schemas"]["ProvisionEnvironmentRequest"]). `mode` defaults to `solo` server-side when
 * blank; the same field validation the backend enforces (digits-only admin phone, alphanumeric code)
 * is mirrored here as the request-side drift guard.
 */
export const ProvisionTenantRequestSchema = z.object({
  centerName: z.string().min(1).max(200),
  code: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/, "platform.provision.codeFormat"),
  mode: z.enum(["solo", "partnership"]),
  adminFullName: z.string().min(1).max(128),
  adminPhone: z
    .string()
    .min(1)
    .max(32)
    .regex(/^\+?[0-9\- ]{7,32}$/, "platform.provision.phoneFormat"),
  adminPassword: z.string().min(8).max(128),
  adminEmail: z.string().email().max(255).optional().or(z.literal("")),
});
export type ProvisionTenantRequest = z.infer<typeof ProvisionTenantRequestSchema>;
