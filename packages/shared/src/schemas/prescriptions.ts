import { z } from "zod";

import { optionalText } from "./common";

/**
 * A prescription on a visit (PRD §5.2-D). `dispenseType` drives fulfilment:
 * `administered_in_clinic` deducts `quantity` from inventory at create time (clinic warehouse or the
 * field doctor's inventory); `dispensed_to_owner` is billed later at POS (M7). `quantity` is
 * required and positive on create. Product / quantity / dispense type are immutable after create.
 * The M18 recurring-dose reminder schedule (`reminderEnabled` + `intervalMinutes`/`startAt`/…) and the
 * advisory text are both editable via the patch.
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
  // M23 — an administered_in_clinic med with `billable` is charged to the customer: it assembles
  // into the visit's invoice like a dispensed one (stock already deducted at recording). Editable
  // until billed; meaningless for dispensed_to_owner (always bills).
  billable: z.boolean(),
  // M18 — recurring-dose reminder schedule (PRD §18.9). When `reminderEnabled`, the server fires a
  // `medication_due` notification ahead of each dose at `startAt + k·intervalMinutes` (k = 0..dosesCount-1,
  // bounded by `endAt`), `leadMinutes` (or the settings default) before each.
  reminderEnabled: z.boolean(),
  intervalMinutes: z.number().int().nullish(),
  leadMinutes: z.number().int().nullish(),
  startAt: z.string().nullish(),
  endAt: z.string().nullish(),
  dosesCount: z.number().int().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PrescriptionResponse = z.infer<typeof PrescriptionResponseSchema>;

/**
 * The M18 recurring-dose reminder fields, shared by create + patch. `intervalMinutes` + `startAt` are
 * required when `reminderEnabled` is true (server-enforced — mirrored here via {@link withReminderRule}).
 */
const reminderFields = {
  reminderEnabled: z.boolean().optional(),
  intervalMinutes: z.number().int().positive().optional(),
  leadMinutes: z.number().int().nonnegative().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  dosesCount: z.number().int().positive().optional(),
};

/** Enforce "an enabled reminder needs an interval + a start" (the backend's create/patch validator). */
function reminderRule(
  val: { reminderEnabled?: boolean; intervalMinutes?: number; startAt?: string },
  ctx: z.RefinementCtx,
): void {
  if (val.reminderEnabled !== true) return;
  if (val.intervalMinutes == null)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["intervalMinutes"], message: "required" });
  if (val.startAt == null || val.startAt === "")
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startAt"], message: "required" });
}

/** Create payload (POST /prescriptions). The wrapper mints the client GUID v7 `id`. */
export const PrescriptionCreateRequestSchema = z
  .object({
    visitId: z.string().min(1),
    productId: z.string().min(1),
    dosage: optionalText,
    frequency: optionalText,
    duration: optionalText,
    notes: optionalText,
    dispenseType: z.enum(["administered_in_clinic", "dispensed_to_owner"]),
    quantity: z.number().positive(),
    billable: z.boolean().optional(),
    ...reminderFields,
  })
  .superRefine(reminderRule);
export type PrescriptionCreateRequest = z.infer<typeof PrescriptionCreateRequestSchema>;

/**
 * Partial update (PATCH /prescriptions/{id}) — advisory text + the M18 reminder schedule + the M23
 * billable toggle (until billed; administered_in_clinic only). Product / quantity / dispense type
 * stay immutable post-create.
 */
export const PrescriptionPatchRequestSchema = z
  .object({
    dosage: z.string().trim().max(128).optional(),
    frequency: z.string().trim().max(128).optional(),
    duration: z.string().trim().max(128).optional(),
    notes: optionalText,
    billable: z.boolean().optional(),
    ...reminderFields,
  })
  .superRefine(reminderRule);
export type PrescriptionPatchRequest = z.infer<typeof PrescriptionPatchRequestSchema>;

export interface PrescriptionListParams {
  visitId?: string;
  skip?: number;
  take?: number;
}
