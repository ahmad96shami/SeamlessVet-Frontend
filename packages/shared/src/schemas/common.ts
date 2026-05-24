import { z } from "zod";

/**
 * The backend's `IdentifierResponse` — a single id, returned by create/update mutations
 * (e.g. POST/PATCH /admin/products) instead of the full entity. The screen refetches the
 * list afterwards, so the id is all the client needs.
 */
export const IdentifierResponseSchema = z.object({ id: z.string() });
export type IdentifierResponse = z.infer<typeof IdentifierResponseSchema>;

/**
 * An optional free-text field on a request body (nullable `string?` columns). Plain
 * `string | undefined` so it composes cleanly with the RHF zod resolver (no `z.preprocess`,
 * whose `unknown` input type breaks form typing). Blank inputs are dropped from the payload at
 * submit time by the form (see the web `omitEmptyStrings` helper), so empties become null, not `""`.
 */
export const optionalText = z.string().trim().optional();
