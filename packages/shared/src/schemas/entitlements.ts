import { z } from "zod";

// ---- Doctor entitlements & settlement (M9) --------------------------------

/**
 * A computed doctor entitlement (GET /doctor-entitlements[/{id}], SCHEMA §8). **Server-authoritative**
 * — clients only read it; the amount is derived server-side from batch config + invoices.
 * `calculationSystem` ∈ EntitlementSystem (drug_profit = System A, direct_fee = System B).
 * M28: `computedAmount` is the doctor's share = the supervision fee when the toggle is on, else 0
 * (no percentage, no ceiling — the ceiling was dropped). `status` ∈ EntitlementStatus
 * (pending|approved|paid). The list endpoint returns an untyped 200 → this is the contract.
 * A row is `batchId`-scoped (a Dawra) or `visitId`-scoped (a non-batch completed visit).
 */
export const DoctorEntitlementResponseSchema = z.object({
  id: z.string(),
  doctorId: z.string(),
  batchId: z.string().nullish(),
  visitId: z.string().nullish(),
  calculationSystem: z.string(),
  computedAmount: z.number(),
  status: z.string(),
  approvedBy: z.string().nullish(),
  approvedAt: z.string().nullish(),
  paidAt: z.string().nullish(),
  paidMethod: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DoctorEntitlementResponse = z.infer<typeof DoctorEntitlementResponseSchema>;

/**
 * Disbursement payload for POST /doctor-entitlements/{id}/pay. The only client-supplied input is the
 * payout method (a PaymentMethod value); the amount is the server-computed entitlement. The
 * entitlement must already be `approved` (and its customer's ledger `closed` — the settlement lock).
 */
export const PayEntitlementRequestSchema = z.object({
  method: z.enum(["cash", "card", "bank_transfer", "credit"]),
});
export type PayEntitlementRequest = z.infer<typeof PayEntitlementRequestSchema>;

/** Query params for the entitlements list — offset-paged. */
export interface EntitlementListParams {
  doctorId?: string;
  status?: string;
  skip?: number;
  take?: number;
}

/**
 * Result of POST /customers/{id}/close-account and (M16) POST /farms/{id}/close-account (PRD §7.7):
 * the now-closed ledger plus the entitlements the settlement workflow produced/refreshed. Closing
 * requires a **zero balance** (the settlement lock — partial payments never release); the server
 * rejects otherwise (409 `settlement_locked`). `farmId` is set for a farm close (with `customerId`
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
