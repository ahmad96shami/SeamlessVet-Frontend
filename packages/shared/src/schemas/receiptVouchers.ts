import { z } from "zod";

import { optionalText } from "./common";

/**
 * A receipt voucher / Sanad Qabd (GET /receipt-vouchers[/{id}]) — acknowledges a payment received
 * from a customer; issuing one posts a `receipt_voucher` ledger credit that reduces the balance.
 * Untyped 200 → this schema is the contract.
 */
export const ReceiptVoucherResponseSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  farmId: z.string().nullish(),
  amount: z.number(),
  method: z.string(),
  issuedBy: z.string(),
  issuedAt: z.string(),
  notes: z.string().nullish(),
  // M19 — set only when `method` is `cheque`.
  chequeNumber: z.string().nullish(),
  chequeBank: z.string().nullish(),
  chequeDueDate: z.string().nullish(),
  createdAt: z.string(),
});
export type ReceiptVoucherResponse = z.infer<typeof ReceiptVoucherResponseSchema>;

/** Query params for the receipt-vouchers list — offset-paged; filter by customerId. */
export interface ReceiptVoucherListParams {
  customerId?: string;
  skip?: number;
  take?: number;
}

/**
 * Issue a receipt voucher (POST /receipt-vouchers). `method` mirrors the PaymentMethod enum; a
 * voucher is money actually received, so the UI offers only the immediate methods (not `credit`).
 * The wrapper mints the `id` + `idempotencyKey`.
 */
export const ReceiptVoucherRequestSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().min(1),
  // M16: optional — credit a farm's ledger instead of the customer's own ledger (must belong to it).
  farmId: z.string().min(1).optional(),
  amount: z.number().positive(),
  method: z.enum(["cash", "card", "bank_transfer", "credit", "cheque"]),
  notes: optionalText,
  // M19 — optional cheque reference metadata, stored when `method` is `cheque`.
  chequeNumber: z.string().trim().max(64).optional(),
  chequeBank: z.string().trim().max(128).optional(),
  chequeDueDate: z.string().optional(),
  idempotencyKey: z.string().min(1).max(128),
});
export type ReceiptVoucherRequest = z.infer<typeof ReceiptVoucherRequestSchema>;
export type ReceiptVoucherInput = Omit<ReceiptVoucherRequest, "id" | "idempotencyKey">;
