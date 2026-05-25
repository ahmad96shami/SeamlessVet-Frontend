import { z } from "zod";

// ---- Batches / Dawra (M8) -------------------------------------------------

/**
 * A supervision batch / Dawra (GET /batches[/{id}], PRD §7.2) — one supervision cycle for a farm.
 * The fee + share fields feed M9's entitlement calculation. `entitlementEnabled` is a **tri-state**:
 * `null` inherits `system_settings.entitlement_enabled_global`, `true`/`false` override per batch
 * (SCHEMA invariant #4). `supervisionFeeModel` ∈ FeeModel, `entitlementSystem` ∈ EntitlementSystem,
 * `status` ∈ BatchStatus (open|closed). Closing a batch triggers the doctor's entitlement compute.
 * Batches are server-authoritative; the list endpoint returns an untyped 200, so this is the contract.
 */
export const BatchResponseSchema = z.object({
  id: z.string(),
  contractId: z.string().nullish(),
  customerId: z.string(),
  responsibleDoctorId: z.string(),
  animalCount: z.number(),
  startDate: z.string(),
  endDate: z.string().nullish(),
  supervisionFeeModel: z.string(),
  supervisionFeeValue: z.number(),
  entitlementEnabled: z.boolean().nullish(),
  entitlementSystem: z.string().nullish(),
  doctorSharePercent: z.number().nullish(),
  doctorShareCeiling: z.number().nullish(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BatchResponse = z.infer<typeof BatchResponseSchema>;

/**
 * Create payload (POST /batches). Mirrors the backend `BatchCreateRequest` + validators:
 * `customerId`, `responsibleDoctorId`, `supervisionFeeModel`, `supervisionFeeValue`, and `startDate`
 * are required; `doctorSharePercent` ∈ [0,100]; `endDate` ≥ `startDate`. Batch financial config is an
 * Admin/Accountant + online-only operation (gated on `contracts.activate`). The wrapper mints the id.
 */
export const BatchCreateRequestSchema = z.object({
  contractId: z.string().optional(),
  customerId: z.string().min(1),
  responsibleDoctorId: z.string().min(1),
  animalCount: z.number().int().min(0),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  supervisionFeeModel: z.enum(["fixed_amount", "percent_of_invoice", "per_bird", "per_batch_fixed"]),
  supervisionFeeValue: z.number().min(0),
  entitlementEnabled: z.boolean().optional(),
  entitlementSystem: z.enum(["drug_profit", "direct_fee"]).optional(),
  doctorSharePercent: z.number().min(0).max(100).optional(),
  doctorShareCeiling: z.number().min(0).optional(),
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
  doctorSharePercent: z.number().min(0).max(100).optional(),
  doctorShareCeiling: z.number().min(0).optional(),
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
