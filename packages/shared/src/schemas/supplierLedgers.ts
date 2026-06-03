import { z } from "zod";

/**
 * A supplier-ledger entry (append-only) — M19 (SCHEMA §4). The AP mirror of a customer LedgerEntry.
 * `amount` is **signed**: positive increases the payable (a purchase invoice), negative reduces it
 * (a payment). `balanceAfter` is the running balance immediately after this entry (positive = owed).
 * `entryType` ∈ purchase_invoice | payment | adjustment.
 */
export const SupplierLedgerEntryResponseSchema = z.object({
  id: z.string(),
  supplierLedgerId: z.string(),
  entryType: z.string(),
  amount: z.number(),
  balanceAfter: z.number(),
  purchaseInvoiceId: z.string().nullish(),
  supplierPaymentId: z.string().nullish(),
  description: z.string().nullish(),
  idempotencyKey: z.string(),
  createdAt: z.string(),
});
export type SupplierLedgerEntryResponse = z.infer<typeof SupplierLedgerEntryResponseSchema>;

/**
 * Supplier account statement (GET /suppliers/{id}/statement) — the AP mirror of the customer/farm
 * statement. `openingBalance` is the running balance just before `from` (0 when no `from`);
 * `closingBalance` is the balance after the last entry in range. Positive balances = the clinic owes
 * the supplier. Untyped 200 → this schema is the contract.
 */
export const SupplierStatementResponseSchema = z.object({
  supplierId: z.string(),
  supplierName: z.string(),
  ledgerId: z.string(),
  openingBalance: z.number(),
  closingBalance: z.number(),
  status: z.string(),
  from: z.string().nullish(),
  to: z.string().nullish(),
  entries: z.array(SupplierLedgerEntryResponseSchema),
});
export type SupplierStatementResponse = z.infer<typeof SupplierStatementResponseSchema>;

/** `from`/`to` are ISO-8601 instants (the backend binds DateTimeOffset); inclusive of the bounds. */
export interface SupplierStatementParams {
  from?: string;
  to?: string;
}
