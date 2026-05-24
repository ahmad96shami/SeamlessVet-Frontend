/** Cross-cutting constants shared by both apps. No platform deps. */

// HTTP headers
export const AUTHORIZATION_HEADER = "Authorization";
/** Required on every mutating endpoint (8–128 chars, [A-Za-z0-9._-]); see API_SURFACE § Cross-cutting. */
export const IDEMPOTENCY_HEADER = "Idempotency-Key";

// Sync write path (PowerSync upload connector + web offline queue both POST here).
export const SYNC_PATH_PREFIX = "/sync";

// Locale / money
export const DEFAULT_LOCALE = "ar" as const;
export const SUPPORTED_LOCALES = ["ar", "en"] as const;
export const DEFAULT_CURRENCY = "ILS" as const;

// Type-generation default (override with VET_API_SPEC_URL).
export const DEFAULT_API_SPEC_URL = "http://localhost:5180/swagger/v1/swagger.json";
