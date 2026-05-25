import { z } from "zod";

import { optionalText } from "./common";

// ---- Contracts (M8) -------------------------------------------------------

/**
 * A farm-supervision contract (GET /contracts[/{id}]). `status` ∈ ContractStatus
 * (draft|active|completed|cancelled). A `draft` is editable offline-safely; once `active` its binding
 * terms lock (edits then need `contracts.activate`). Date fields are `yyyy-MM-dd` (DateOnly).
 * `totalPrice` is the agreed contract value; per-medication overrides live under
 * `/contracts/{id}/medication-prices`. `activatedBy/At` are stamped by the activation gate.
 * The list endpoint returns an untyped 200, so this schema is the contract.
 */
export const ContractResponseSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  responsibleDoctorId: z.string().nullish(),
  periodStart: z.string(),
  periodEnd: z.string().nullish(),
  totalPrice: z.number().nullish(),
  expectedVisitCount: z.number().nullish(),
  animalType: z.string().nullish(),
  animalCount: z.number().nullish(),
  status: z.string(),
  createdBy: z.string().nullish(),
  activatedBy: z.string().nullish(),
  activatedAt: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ContractResponse = z.infer<typeof ContractResponseSchema>;

/**
 * Create payload (POST /contracts). Mirrors the backend `ContractCreateRequest` + validators: only
 * `customerId` + `periodStart` are required; `periodEnd` must be ≥ `periodStart`. Born `draft` by
 * default — creating it directly `active` needs `contracts.activate` (the web flow creates drafts and
 * activates via /activate, so the form omits `status`). The wrapper mints the client GUID v7 `id`.
 */
export const ContractCreateRequestSchema = z.object({
  customerId: z.string().min(1),
  responsibleDoctorId: z.string().optional(),
  periodStart: z.string().min(1),
  periodEnd: z.string().optional(),
  totalPrice: z.number().min(0).optional(),
  expectedVisitCount: z.number().int().min(0).optional(),
  animalType: optionalText,
  animalCount: z.number().int().min(0).optional(),
  status: z.enum(["draft", "active"]).optional(),
});
export type ContractCreateRequest = z.infer<typeof ContractCreateRequestSchema>;

/**
 * Term edit (PATCH /contracts/{id}). Every field optional — only supplied ones change. `customerId`
 * and `status` are not patchable here (status moves through /activate · /complete · /cancel). Editing
 * a `draft` needs `contracts.write`; editing an `active` contract's terms additionally needs
 * `contracts.activate`; `completed`/`cancelled` contracts are locked server-side.
 */
export const ContractPatchRequestSchema = z.object({
  responsibleDoctorId: z.string().optional(),
  periodStart: z.string().min(1).optional(),
  periodEnd: z.string().optional(),
  totalPrice: z.number().min(0).optional(),
  expectedVisitCount: z.number().int().min(0).optional(),
  animalType: optionalText,
  animalCount: z.number().int().min(0).optional(),
});
export type ContractPatchRequest = z.infer<typeof ContractPatchRequestSchema>;

/** Query params for the contracts list — offset-paged. */
export interface ContractListParams {
  customerId?: string;
  responsibleDoctorId?: string;
  status?: string;
  skip?: number;
  take?: number;
}

// ---- Contract medication prices (M8) --------------------------------------

/**
 * A per-medication price override on a contract (GET /contracts/{contractId}/medication-prices,
 * PRD §6.6). When the contract is active and covers an invoice date, `IPricingService` bills the
 * medication at `contractPrice` instead of the catalog price. Created/edited only while the parent
 * contract is `draft`.
 */
export const ContractMedicationPriceResponseSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  productId: z.string(),
  contractPrice: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ContractMedicationPriceResponse = z.infer<typeof ContractMedicationPriceResponseSchema>;

/**
 * Create (POST /contracts/{contractId}/medication-prices) — the parent `contractId` comes from the
 * route, not the body; the parent contract must be `draft`. The wrapper mints the client GUID v7 `id`.
 */
export const ContractMedicationPriceCreateRequestSchema = z.object({
  productId: z.string().min(1),
  contractPrice: z.number().min(0),
});
export type ContractMedicationPriceCreateRequest = z.infer<
  typeof ContractMedicationPriceCreateRequestSchema
>;

/** Patch (PATCH /contracts/{contractId}/medication-prices/{priceId}) — parent must be `draft`. */
export const ContractMedicationPricePatchRequestSchema = z.object({
  contractPrice: z.number().min(0).optional(),
});
export type ContractMedicationPricePatchRequest = z.infer<
  typeof ContractMedicationPricePatchRequestSchema
>;
