import {
  centerByCode as sharedCenterByCode,
  fetchCenters,
  login as sharedLogin,
  LogoutRequestSchema,
  RegisterRequestSchema,
  type CenterOption,
  type LoginRequest,
  type LogoutRequest,
  type RegisterRequest,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

/** POST /auth/centers — the active centers a phone belongs to (tenant-routed login, step one). */
export const centers = (phone: string): Promise<CenterOption[]> => fetchCenters(apiClient, phone);

/** POST /auth/center-by-code — resolve a center by its code (registration routing). 404 if unknown. */
export const centerByCode = (code: string): Promise<CenterOption> => sharedCenterByCode(apiClient, code);

/** POST /auth/login — reuses the shared, Zod-validated wrapper bound to this app's client. */
export const login = (body: LoginRequest) => sharedLogin(apiClient, body);

/** POST /auth/register — creates an inactive account + pending request (200, no body). */
export async function register(body: RegisterRequest): Promise<void> {
  await apiClient.post("/auth/register", RegisterRequestSchema.parse(body));
}

/** POST /auth/logout — revokes the presented refresh token. */
export async function logout(body: LogoutRequest): Promise<void> {
  await apiClient.post("/auth/logout", LogoutRequestSchema.parse(body));
}
