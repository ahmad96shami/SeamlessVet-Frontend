import { z } from "zod";

/**
 * A doctor-partner-ledger entry (append-only) — M30 (SCHEMA §4). The AP mirror of a supplier
 * LedgerEntry. `amount` is **signed**: positive raises the payable (an `entitlement` credit posted when a
 * supervision batch is settled), negative reduces it (a `payment`). `balanceAfter` is the running balance
 * immediately after this entry (positive = the clinic owes the doctor). `entryType` ∈ entitlement |
 * payment | adjustment. The back-link ids point at the source row (`doctorEntitlementId` + `batchId` for a
 * settle credit, `doctorPartnerPaymentId` for a payment).
 */
export const DoctorPartnerLedgerEntryResponseSchema = z.object({
  id: z.string(),
  doctorPartnerLedgerId: z.string(),
  entryType: z.string(),
  amount: z.number(),
  balanceAfter: z.number(),
  doctorEntitlementId: z.string().nullish(),
  batchId: z.string().nullish(),
  doctorPartnerPaymentId: z.string().nullish(),
  description: z.string().nullish(),
  idempotencyKey: z.string(),
  createdAt: z.string(),
});
export type DoctorPartnerLedgerEntryResponse = z.infer<typeof DoctorPartnerLedgerEntryResponseSchema>;

/**
 * Doctor-partner account statement (GET /doctor-partners/{id}/statement) — the AP mirror of the supplier
 * statement. `openingBalance` is the running balance just before `from` (0 when no `from`);
 * `closingBalance` is the balance after the last entry in range. Positive balances = the clinic owes the
 * doctor. Untyped 200 → this schema is the contract.
 */
export const DoctorPartnerStatementResponseSchema = z.object({
  doctorPartnerId: z.string(),
  doctorName: z.string(),
  ledgerId: z.string(),
  openingBalance: z.number(),
  closingBalance: z.number(),
  status: z.string(),
  from: z.string().nullish(),
  to: z.string().nullish(),
  entries: z.array(DoctorPartnerLedgerEntryResponseSchema),
});
export type DoctorPartnerStatementResponse = z.infer<typeof DoctorPartnerStatementResponseSchema>;

/** `from`/`to` are ISO-8601 instants (the backend binds DateTimeOffset); inclusive of the bounds. */
export interface DoctorPartnerStatementParams {
  from?: string;
  to?: string;
}
