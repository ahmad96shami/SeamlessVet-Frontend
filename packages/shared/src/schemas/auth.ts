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
