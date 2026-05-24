import { v7 as uuidv7 } from "uuid";

/**
 * Client-side GUID v7 for a new row's `id` — every syncable row is created with an
 * id minted on the client so records can be created entirely offline (SCHEMA § Conventions).
 */
export function newGuidV7(): string {
  return uuidv7();
}

/**
 * A fresh idempotency key. A uuid v7 string (36 chars, [0-9a-f-]) satisfies the backend's
 * 8–128 char `[A-Za-z0-9._-]` rule. Mint ONCE per logical mutation and reuse on retries
 * (the offline queue persists it) so a replayed submit is applied at most once.
 */
export function idempotencyKey(): string {
  return uuidv7();
}
