import { z } from "zod";

import { optionalText } from "./common";

/** A farm/site owned by a customer (M15). Attached the way pets are; inherits the customer's doctor. */
export const FarmResponseSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  name: z.string(),
  kind: z.string(),
  location: z.string().nullish(),
  animalType: z.string().nullish(),
  headCount: z.number().nullish(),
  notes: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FarmResponse = z.infer<typeof FarmResponseSchema>;

/**
 * Create + partial-update payload. Mirrors the backend Farm(Patch)Request validators: `name`
 * required; `kind` ∈ the FarmKind enum; `headCount` ≥ 0. The wrapper mints the client GUID v7 `id`.
 */
export const FarmRequestSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().trim().min(1).max(128),
  kind: z.enum(["poultry", "cattle", "mixed", "other"]),
  location: optionalText,
  animalType: z.string().trim().max(64).optional(),
  headCount: z.number().int().nonnegative().optional(),
  notes: optionalText,
});
export type FarmRequest = z.infer<typeof FarmRequestSchema>;

export interface FarmListParams {
  customerId?: string;
  search?: string;
  skip?: number;
  take?: number;
}
