import { z } from "zod";

import { optionalText } from "./common";

/**
 * A supplier payment (GET /suppliers/{id}/payments) — M19 (SCHEMA §4). The AP mirror of a receipt
 * voucher: posting one appends a `payment` ledger entry that reduces the supplier balance. `method` ∈
 * cash | card | bank_transfer | cheque (never credit — a payment is money actually leaving). A cheque
 * settles immediately and carries optional reference metadata. Untyped 200 → this schema is the contract.
 */
export const SupplierPaymentResponseSchema = z.object({
  id: z.string(),
  supplierId: z.string(),
  amount: z.number(),
  method: z.string(),
  paidBy: z.string(),
  paidAt: z.string(),
  notes: z.string().nullish(),
  chequeNumber: z.string().nullish(),
  chequeBank: z.string().nullish(),
  chequeDueDate: z.string().nullish(),
  createdAt: z.string(),
});
export type SupplierPaymentResponse = z.infer<typeof SupplierPaymentResponseSchema>;

/**
 * Record a supplier payment (POST /suppliers/{supplierId}/payments). The supplier is taken from the
 * route, not the body. The wrapper mints the `id` + `idempotencyKey`. Cheque metadata is stored only
 * when `method` is `cheque`.
 */
export const SupplierPaymentRequestSchema = z.object({
  id: z.string().optional(),
  amount: z.number().positive(),
  method: z.enum(["cash", "card", "bank_transfer", "cheque"]),
  notes: optionalText,
  chequeNumber: z.string().trim().max(64).optional(),
  chequeBank: z.string().trim().max(128).optional(),
  // DateOnly on the wire ("YYYY-MM-DD").
  chequeDueDate: z.string().optional(),
  idempotencyKey: z.string().min(1).max(128),
});
export type SupplierPaymentRequest = z.infer<typeof SupplierPaymentRequestSchema>;
export type SupplierPaymentInput = Omit<SupplierPaymentRequest, "id" | "idempotencyKey">;

/** Query params for a supplier's payment history — offset-paged. */
export interface SupplierPaymentListParams {
  skip?: number;
  take?: number;
}
