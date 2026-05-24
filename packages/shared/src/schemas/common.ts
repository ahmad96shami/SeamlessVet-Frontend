import { z } from "zod";

/**
 * The backend's `IdentifierResponse` — a single id, returned by create/update mutations
 * (e.g. POST/PATCH /admin/products) instead of the full entity. The screen refetches the
 * list afterwards, so the id is all the client needs.
 */
export const IdentifierResponseSchema = z.object({ id: z.string() });
export type IdentifierResponse = z.infer<typeof IdentifierResponseSchema>;

/**
 * An optional free-text field on a request body: trims whitespace and treats an empty
 * string as "not provided" (→ `undefined`), so a blank form input is omitted from the
 * payload rather than sent as `""`. Use for nullable `string?` columns on create/replace.
 */
export const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().optional(),
);
