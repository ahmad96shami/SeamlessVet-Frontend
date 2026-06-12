import { z } from "zod";

import { optionalText } from "./common";

/**
 * A doctor-partner payment (GET /doctor-partners/{id}/payments) — M30 (SCHEMA §4). Posting one appends a
 * `payment` ledger entry that reduces the doctor's balance (the AP mirror of a supplier payment). `method`
 * ∈ cash | card | bank_transfer | cheque (never credit — a payment is money actually leaving). A cheque
 * settles immediately and carries optional reference metadata. Untyped 200 → this schema is the contract.
 */
export const DoctorPartnerPaymentResponseSchema = z.object({
  id: z.string(),
  doctorPartnerId: z.string(),
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
export type DoctorPartnerPaymentResponse = z.infer<typeof DoctorPartnerPaymentResponseSchema>;

/**
 * Record a doctor-partner payment (POST /doctor-partners/{doctorPartnerId}/payments). The partner is
 * taken from the route, not the body. The wrapper mints the `id` + `idempotencyKey`. Cheque metadata is
 * stored only when `method` is `cheque`.
 */
export const DoctorPartnerPaymentRequestSchema = z.object({
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
export type DoctorPartnerPaymentRequest = z.infer<typeof DoctorPartnerPaymentRequestSchema>;
export type DoctorPartnerPaymentInput = Omit<DoctorPartnerPaymentRequest, "id" | "idempotencyKey">;

/** Query params for a doctor-partner's payment history — offset-paged. */
export interface DoctorPartnerPaymentListParams {
  skip?: number;
  take?: number;
}
