import type { AxiosInstance } from "axios";

import {
  LoginRequestSchema,
  LoginResponseSchema,
  type LoginRequest,
  type LoginResponse,
} from "../schemas/auth";

/**
 * POST /auth/login — phone + password → tokens.
 * Validates the request and the response with Zod (runtime drift guard at the identity boundary).
 * `/auth/*` is exempt from the Idempotency-Key requirement (API_SURFACE § Cross-cutting).
 */
export async function login(client: AxiosInstance, body: LoginRequest): Promise<LoginResponse> {
  const payload = LoginRequestSchema.parse(body);
  const response = await client.post("/auth/login", payload);
  return LoginResponseSchema.parse(response.data);
}
