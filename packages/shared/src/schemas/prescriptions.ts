import { z } from "zod";

import { optionalText } from "./common";

/**
 * A prescription on a visit (PRD §5.2-D). `dispenseType` drives fulfilment:
 * `administered_in_clinic` deducts `quantity` from inventory at create time (clinic warehouse or the
 * field doctor's inventory); `dispensed_to_owner` is billed later at POS (M7). `quantity` is
 * required and positive on create. Product / quantity / dispense type are immutable after create —
 * the patch edits the advisory text only.
 */
export const PrescriptionResponseSchema = z.object({
  id: z.string(),
  visitId: z.string(),
  productId: z.string(),
  dosage: z.string().nullish(),
  frequency: z.string().nullish(),
  duration: z.string().nullish(),
  notes: z.string().nullish(),
  dispenseType: z.string(),
  quantity: z.number().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PrescriptionResponse = z.infer<typeof PrescriptionResponseSchema>;

/** Create payload (POST /prescriptions). The wrapper mints the client GUID v7 `id`. */
export const PrescriptionCreateRequestSchema = z.object({
  visitId: z.string().min(1),
  productId: z.string().min(1),
  dosage: optionalText,
  frequency: optionalText,
  duration: optionalText,
  notes: optionalText,
  dispenseType: z.enum(["administered_in_clinic", "dispensed_to_owner"]),
  quantity: z.number().positive(),
});
export type PrescriptionCreateRequest = z.infer<typeof PrescriptionCreateRequestSchema>;

/** Partial update (PATCH /prescriptions/{id}) — advisory text only. */
export const PrescriptionPatchRequestSchema = z.object({
  dosage: z.string().trim().max(128).optional(),
  frequency: z.string().trim().max(128).optional(),
  duration: z.string().trim().max(128).optional(),
  notes: optionalText,
});
export type PrescriptionPatchRequest = z.infer<typeof PrescriptionPatchRequestSchema>;

export interface PrescriptionListParams {
  visitId?: string;
  skip?: number;
  take?: number;
}
