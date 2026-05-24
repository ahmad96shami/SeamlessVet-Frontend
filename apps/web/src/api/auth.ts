import {
  login as sharedLogin,
  LogoutRequestSchema,
  RegisterRequestSchema,
  type LoginRequest,
  type LogoutRequest,
  type RegisterRequest,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

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
