import { z } from "zod";

import { optionalText } from "./common";

/** A pet's master medical profile (GET /pets[/{id}]). Per-visit detail lives on visits (M5/W4). */
export const PetResponseSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  name: z.string(),
  species: z.string().nullish(),
  breed: z.string().nullish(),
  sex: z.string().nullish(),
  dateOfBirth: z.string().nullish(), // DateOnly → "yyyy-MM-dd"
  colorMarks: z.string().nullish(),
  weightLatest: z.number().nullish(),
  photoUrl: z.string().nullish(),
  microchipNo: z.string().nullish(),
  healthNotes: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PetResponse = z.infer<typeof PetResponseSchema>;

/**
 * Create + partial-update payload. Mirrors the backend Pet(Patch)Request validators. `sex` ∈ the
 * PetSex enum; `weightLatest` is ≥ 0; `dateOfBirth` is a "yyyy-MM-dd" date. The wrapper mints the
 * client GUID v7 `id`. (Photo upload to R2 is a W4 attachment flow — `photoUrl` is not collected here.)
 */
export const PetRequestSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().trim().min(1).max(128),
  species: z.string().trim().max(64).optional(),
  breed: z.string().trim().max(128).optional(),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  dateOfBirth: optionalText,
  colorMarks: optionalText,
  weightLatest: z.number().nonnegative().optional(),
  microchipNo: z.string().trim().max(64).optional(),
  healthNotes: optionalText,
});
export type PetRequest = z.infer<typeof PetRequestSchema>;

/** POST /pets/{id}/transfer — move a pet to another owner (dedicated endpoint, not a free PATCH). */
export const PetTransferRequestSchema = z.object({
  targetCustomerId: z.string().min(1),
});
export type PetTransferRequest = z.infer<typeof PetTransferRequestSchema>;

export interface PetListParams {
  customerId?: string;
  search?: string;
  skip?: number;
  take?: number;
}
