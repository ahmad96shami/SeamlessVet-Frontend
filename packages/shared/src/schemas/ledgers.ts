import { z } from "zod";

/**
 * A ledger entry (append-only). `amount` is **signed**: positive increases debt (debit / مدين),
 * negative reduces it (credit / دائن). `balanceAfter` is the running balance immediately after this
 * entry applied (positive = owed). `entryType` ∈ the LedgerEntryType enum.
 */
export const LedgerEntryResponseSchema = z.object({
  id: z.string(),
  ledgerId: z.string(),
  entryType: z.string(),
  amount: z.number(),
  balanceAfter: z.number(),
  invoiceId: z.string().nullish(),
  receiptVoucherId: z.string().nullish(),
  description: z.string().nullish(),
  idempotencyKey: z.string(),
  createdAt: z.string(),
});
export type LedgerEntryResponse = z.infer<typeof LedgerEntryResponseSchema>;

/**
 * Account statement (GET /customers/{id}/statement) — everything the WhatsApp/print renderer needs.
 * `openingBalance` is the running balance just before `from` (0 when no `from`); `closingBalance` is
 * the balance after the last entry in range. Positive balances = the customer owes the clinic.
 */
export const StatementResponseSchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  ledgerId: z.string(),
  openingBalance: z.number(),
  closingBalance: z.number(),
  status: z.string(),
  from: z.string().nullish(),
  to: z.string().nullish(),
  entries: z.array(LedgerEntryResponseSchema),
});
export type StatementResponse = z.infer<typeof StatementResponseSchema>;

/** `from`/`to` are ISO-8601 instants (the backend binds DateTimeOffset); inclusive of the bounds. */
export interface StatementParams {
  from?: string;
  to?: string;
}
