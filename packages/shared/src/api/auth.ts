import type { AxiosInstance } from "axios";

import {
  LoginRequestSchema,
  LoginResponseSchema,
  PowerSyncTokenResponseSchema,
  type LoginRequest,
  type LoginResponse,
  type PowerSyncTokenResponse,
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

/**
 * POST /auth/powersync-token — mint the short-lived JWT the PowerSync SDK presents on its
 * sync stream. Called from `PowerSyncBackendConnector.fetchCredentials` on connect and again
 * before expiry. Server validates this JWT via the public half exposed at /.well-known/jwks.json.
 */
export async function fetchPowerSyncToken(client: AxiosInstance): Promise<PowerSyncTokenResponse> {
  const response = await client.post("/auth/powersync-token");
  return PowerSyncTokenResponseSchema.parse(response.data);
}
