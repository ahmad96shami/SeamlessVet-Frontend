import { z } from "zod";

/**
 * One center (tenant/environment) a phone number belongs to — the unit of the tenant-routed
 * login picker (M34). Returned by `/auth/centers` and `/auth/center-by-code`. `name` is the
 * human label shown in the picker + shell header; `code` is the admin-issued routing key used
 * at registration; `environmentId` is the tenant key the client must send on login/register.
 * The endpoints declare no typed 200 body, so this Zod schema is the contract.
 */
export const CenterOptionSchema = z.object({
  environmentId: z.string().min(1),
  name: z.string(),
  code: z.string(),
});
export type CenterOption = z.infer<typeof CenterOptionSchema>;

/** POST /auth/centers request — the active centers a phone belongs to (suspended ones hidden). */
export const CentersLookupRequestSchema = z.object({
  phone: z.string().min(1),
});
export type CentersLookupRequest = z.infer<typeof CentersLookupRequestSchema>;

/** POST /auth/centers response — always 200; an empty list means no active center for that phone. */
export const CentersLookupResponseSchema = z.object({
  centers: z.array(CenterOptionSchema),
});
export type CentersLookupResponse = z.infer<typeof CentersLookupResponseSchema>;

/** POST /auth/center-by-code request — resolve a center by its admin-issued code (registration routing). */
export const CenterByCodeRequestSchema = z.object({
  code: z.string().min(1),
});
export type CenterByCodeRequest = z.infer<typeof CenterByCodeRequestSchema>;

/**
 * POST /auth/login request — mirrors components["schemas"]["LoginRequest"]. Tenant-routed since
 * M34: `environmentId` names the center (picked via `/auth/centers`) the credentials belong to.
 */
export const LoginRequestSchema = z.object({
  environmentId: z.string().min(1),
  phonePrimary: z.string().min(1),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * POST /auth/login response (API_SURFACE § Auth). The OpenAPI spec declares no typed body
 * for the 200, so this Zod schema is the contract — verified against the live response shape.
 * `numberPrefix` is the admin-assigned per-environment prefix used to mint per-user
 * `{prefix}-{seq}` visit / invoice numbers client-side (Mo2 — the field doctor mints
 * `visit_number` for offline visits). Null when no prefix is assigned (admin/accountant
 * roles never get one). `fullName` powers the greeting / profile header (MoD) — the JWT
 * carries no name claim.
 */
export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresAt: z.string(), // ISO-8601
  refreshToken: z.string().min(1),
  refreshTokenExpiresAt: z.string(), // ISO-8601
  userId: z.string(),
  roleKey: z.string(),
  fullName: z.string(),
  numberPrefix: z.string().nullish(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/**
 * POST /auth/register request — RegisterRequest. Creates an inactive account + pending request.
 * Tenant-routed since M34: `environmentId` names the center (resolved via `/auth/center-by-code`).
 */
export const RegisterRequestSchema = z.object({
  environmentId: z.string().min(1),
  fullName: z.string().min(1),
  phonePrimary: z.string().min(1),
  password: z.string().min(8),
  requestedRoleKey: z.string().min(1),
  email: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseDetails: z.string().optional(),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

/** POST /auth/refresh request — rotates the refresh token (the old one is revoked server-side). */
export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

/** POST /auth/refresh response — a fresh token bundle (userId/roleKey/fullName/numberPrefix may or may not be echoed). */
export const RefreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresAt: z.string(),
  refreshToken: z.string().min(1),
  refreshTokenExpiresAt: z.string(),
  userId: z.string().optional(),
  roleKey: z.string().optional(),
  fullName: z.string().optional(),
  numberPrefix: z.string().nullish(),
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

/** POST /auth/logout request — revokes the presented refresh token. */
export const LogoutRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;

/**
 * POST /auth/powersync-token response (API_SURFACE § Auth) — mints a short-lived JWT for
 * the PowerSync SDK to authenticate its stream. The OpenAPI spec declares no typed body
 * for the 200, so this Zod schema is the contract — verified against the live response shape.
 */
export const PowerSyncTokenResponseSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.string(), // ISO-8601
});
export type PowerSyncTokenResponse = z.infer<typeof PowerSyncTokenResponseSchema>;
