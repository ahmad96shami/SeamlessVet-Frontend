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
 */
export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresAt: z.string(), // ISO-8601
  refreshToken: z.string().min(1),
  refreshTokenExpiresAt: z.string(), // ISO-8601
  userId: z.string(),
  roleKey: z.string(),
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

/** POST /auth/refresh response — a fresh token bundle (userId/roleKey may or may not be echoed). */
export const RefreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresAt: z.string(),
  refreshToken: z.string().min(1),
  refreshTokenExpiresAt: z.string(),
  userId: z.string().optional(),
  roleKey: z.string().optional(),
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

/** POST /auth/logout request — revokes the presented refresh token. */
export const LogoutRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;
