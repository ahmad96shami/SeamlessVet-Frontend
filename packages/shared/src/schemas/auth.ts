import { z } from "zod";

/** POST /auth/login request — mirrors components["schemas"]["LoginRequest"]. */
export const LoginRequestSchema = z.object({
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

/** POST /auth/register request — RegisterRequest. Creates an inactive account + pending request. */
export const RegisterRequestSchema = z.object({
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
