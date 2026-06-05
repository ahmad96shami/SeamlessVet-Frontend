import type { AxiosInstance } from "axios";

import {
  RegisterPushTokenRequestSchema,
  UnregisterPushTokenRequestSchema,
  type RegisterPushTokenRequest,
  type UnregisterPushTokenRequest,
} from "../schemas/devices";

/**
 * POST /devices/push-token — register (or re-register) this device's Expo push token for the
 * authenticated user. Upserts by token server-side, so calling it on every sign-in / token
 * rotation is safe. 204; auth-only (self-scoped, like /notifications).
 */
export async function registerPushToken(
  client: AxiosInstance,
  body: RegisterPushTokenRequest,
): Promise<void> {
  await client.post("/devices/push-token", RegisterPushTokenRequestSchema.parse(body));
}

/**
 * POST /devices/push-token/unregister — drop this device's token (logout). Idempotent and
 * own-token-only server-side (someone else's token is a silent no-op). 204.
 */
export async function unregisterPushToken(
  client: AxiosInstance,
  body: UnregisterPushTokenRequest,
): Promise<void> {
  await client.post("/devices/push-token/unregister", UnregisterPushTokenRequestSchema.parse(body));
}
