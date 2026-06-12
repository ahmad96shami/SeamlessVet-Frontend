import { z } from "zod";

// ---- Doctor entitlements & settlement (M9 · M30) --------------------------

/**
 * A computed doctor entitlement (GET /doctor-entitlements[/{id}], SCHEMA §8). **Server-authoritative**
 * — clients only read it; the amount is derived server-side from batch config + invoices.
 * `calculationSystem` ∈ EntitlementSystem (drug_profit = System A, direct_fee = System B).
 * `computedAmount` is the doctor's share = the supervision fee when the toggle is on, else 0 (M28: no
 * percentage, no ceiling). **M30:** the approve/pay lifecycle is gone — a row is created **only when its
 * batch is settled** and immediately credited to the responsible doctor's partner ledger (an immutable,
 * batch-scoped accrual). The list endpoint returns an untyped 200 → this is the contract.
 */
export const DoctorEntitlementResponseSchema = z.object({
  id: z.string(),
  doctorId: z.string(),
  batchId: z.string(),
  calculationSystem: z.string(),
  computedAmount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DoctorEntitlementResponse = z.infer<typeof DoctorEntitlementResponseSchema>;

/** Query params for the entitlements list — offset-paged. */
export interface EntitlementListParams {
  doctorId?: string;
  skip?: number;
  take?: number;
}

/**
 * Result of POST /customers/{id}/close-account and (M16) POST /farms/{id}/close-account (PRD §7.7):
 * the now-closed ledger plus the entitlements for the account's settled batches (read-only — **M30**
 * removed the settlement lock and the close-time compute; entitlements accrue when a batch is settled).
 * Closing/reopening is gated on `contracts.activate`. `farmId` is set for a farm close (with `customerId`
 * the owning customer), null for a customer close.
 */
export const CloseAccountResponseSchema = z.object({
  customerId: z.string(),
  farmId: z.string().nullish(),
  ledgerId: z.string(),
  status: z.string(),
  closedAt: z.string().nullish(),
  entitlements: z.array(DoctorEntitlementResponseSchema),
});
export type CloseAccountResponse = z.infer<typeof CloseAccountResponseSchema>;
