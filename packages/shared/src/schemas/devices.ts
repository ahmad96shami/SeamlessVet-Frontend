import { z } from "zod";

/**
 * M21 — push-token registration (`POST /devices/push-token` + `/unregister`). Self-scoped: the
 * device is identified by the Expo token itself (globally unique server-side — one physical
 * device, one row); the owner is always the authenticated caller, never a body field. Register
 * upserts (a shared device re-registering under whoever signed in is reassigned), unregister is
 * idempotent — both return 204, so these request schemas are the whole contract.
 */
export const PUSH_PLATFORM_VALUES = ["android", "ios"] as const;
export const PushPlatformSchema = z.enum(PUSH_PLATFORM_VALUES);
export type PushPlatform = z.infer<typeof PushPlatformSchema>;

export const RegisterPushTokenRequestSchema = z.object({
  token: z.string().min(1).max(512),
  platform: PushPlatformSchema,
});
export type RegisterPushTokenRequest = z.infer<typeof RegisterPushTokenRequestSchema>;

export const UnregisterPushTokenRequestSchema = z.object({
  token: z.string().min(1).max(512),
});
export type UnregisterPushTokenRequest = z.infer<typeof UnregisterPushTokenRequestSchema>;
