import type { AxiosInstance } from "axios";

import {
  CenterOptionSchema,
  CentersLookupResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  PowerSyncTokenResponseSchema,
  type CenterOption,
  type LoginRequest,
  type LoginResponse,
  type PowerSyncTokenResponse,
} from "../schemas/auth";

/**
 * POST /auth/centers — the active centers a phone number belongs to (M34, tenant-routed login).
 * Anonymous + IP-rate-limited; always 200 (an empty array means "no active center for this phone";
 * suspended centers are hidden server-side). Step one of the two-step login: pick a center → its
 * `environmentId` scopes the `/auth/login` call.
 */
export async function fetchCenters(client: AxiosInstance, phone: string): Promise<CenterOption[]> {
  const response = await client.post("/auth/centers", { phone });
  return CentersLookupResponseSchema.parse(response.data).centers;
}

/**
 * POST /auth/center-by-code — resolve one center by its admin-issued code (M34). Used by the
 * registration flow to route a sign-up request to the right tenant. 404 when no active center
 * matches the code (surfaced to the user as an unknown-code error).
 */
export async function centerByCode(client: AxiosInstance, code: string): Promise<CenterOption> {
  const response = await client.post("/auth/center-by-code", { code });
  return CenterOptionSchema.parse(response.data);
}

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
