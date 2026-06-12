import { z } from "zod";

// ---- Batches / Dawra (M8) -------------------------------------------------

/**
 * A supervision batch / Dawra (GET /batches[/{id}], PRD §7.2) — one supervision cycle for a farm.
 * M28 reformulation: the supervision fee (`supervisionFeeModel`/`supervisionFeeValue`) **is** the
 * doctor's entitlement — no percentage, no ceiling, no clamp (the clinic share may go negative).
 * `entitlementEnabled` is a **tri-state**: `null` inherits `system_settings.entitlement_enabled_global`,
 * `true`/`false` override per batch (SCHEMA invariant #4). `supervisionFeeModel` ∈ FeeModel,
 * `entitlementSystem` ∈ EntitlementSystem (drug_profit = clinic funds the fee, direct_fee = farmer
 * charged on top), `status` ∈ BatchStatus (open|closed). Batches are server-authoritative; the list
 * endpoint returns an untyped 200, so this is the contract.
 */
export const BatchResponseSchema = z.object({
  id: z.string(),
  contractId: z.string().nullish(),
  customerId: z.string(),
  /** M16 — the specific farm this batch supervises (a farm of `customerId`); null = the customer at large. Drives per-farm ledger routing + settlement. */
  farmId: z.string().nullish(),
  responsibleDoctorId: z.string(),
  animalCount: z.number(),
  startDate: z.string(),
  endDate: z.string().nullish(),
  supervisionFeeModel: z.string(),
  supervisionFeeValue: z.number(),
  entitlementEnabled: z.boolean().nullish(),
  entitlementSystem: z.string().nullish(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** M24 — set once the batch has a settlement (تصفية); routes the web's settle action + badge. */
  settledAt: z.string().nullish(),
});
export type BatchResponse = z.infer<typeof BatchResponseSchema>;

/**
 * Create payload (POST /batches). Mirrors the backend `BatchCreateRequest` + validators:
 * `customerId`, `responsibleDoctorId`, `supervisionFeeModel`, `supervisionFeeValue`, and `startDate`
 * are required; `endDate` ≥ `startDate`. M28 dropped the doctor share %/ceiling — the supervision fee
 * itself is the entitlement. Batch financial config is an Admin/Accountant + online-only operation
 * (gated on `contracts.activate`). The wrapper mints the id.
 */
export const BatchCreateRequestSchema = z.object({
  contractId: z.string().optional(),
  customerId: z.string().min(1),
  /** Optional — restrict the batch to one farm of `customerId` (validated same-customer → 409 `farm_customer_mismatch`). */
  farmId: z.string().optional(),
  responsibleDoctorId: z.string().min(1),
  animalCount: z.number().int().min(0),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  supervisionFeeModel: z.enum(["fixed_amount", "percent_of_invoice", "per_bird", "per_batch_fixed"]),
  supervisionFeeValue: z.number().min(0),
  entitlementEnabled: z.boolean().optional(),
  entitlementSystem: z.enum(["drug_profit", "direct_fee"]).optional(),
  status: z.enum(["open", "closed"]).optional(),
});
export type BatchCreateRequest = z.infer<typeof BatchCreateRequestSchema>;

/**
 * Batch edit (PATCH /batches/{id}). Every field optional — only supplied ones change. Note: a
 * tri-state nullable (`entitlementEnabled`) can be set true/false via PATCH but **cannot** be reverted
 * to "inherit" (null) — recreate the batch for that. Moving `status` → `closed` computes entitlements.
 */
export const BatchPatchRequestSchema = z.object({
  contractId: z.string().optional(),
  /** Re-target the batch's farm (same-customer rule enforced server-side). */
  farmId: z.string().optional(),
  responsibleDoctorId: z.string().optional(),
  animalCount: z.number().int().min(0).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().optional(),
  supervisionFeeModel: z
    .enum(["fixed_amount", "percent_of_invoice", "per_bird", "per_batch_fixed"])
    .optional(),
  supervisionFeeValue: z.number().min(0).optional(),
  entitlementEnabled: z.boolean().optional(),
  entitlementSystem: z.enum(["drug_profit", "direct_fee"]).optional(),
  status: z.enum(["open", "closed"]).optional(),
});
export type BatchPatchRequest = z.infer<typeof BatchPatchRequestSchema>;

/** Query params for the batches list — offset-paged. */
export interface BatchListParams {
  customerId?: string;
  responsibleDoctorId?: string;
  contractId?: string;
  status?: string;
  skip?: number;
  take?: number;
}
