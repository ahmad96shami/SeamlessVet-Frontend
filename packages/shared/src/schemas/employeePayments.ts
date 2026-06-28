import { z } from "zod";

import { optionalText } from "./common";

/**
 * An employee payment (GET /employees/{id}/payments) — M31 (SCHEMA §4). Posting one appends a signed
 * ledger entry per `kind` (the HR mirror of a supplier payment). `kind` ∈ salary_payment | loan |
 * loan_repayment. On a `salary_payment`, `loanRepaymentAmount` > 0 repays a loan out of that salary (the
 * future-salary-deduction pairing): the full salary posts as a salary_payment and the deducted portion
 * as a paired loan_repayment, so the net cash handed over is `amount − loanRepaymentAmount`. `method` ∈
 * cash | card | bank_transfer | cheque (never credit). A cheque settles immediately and carries optional
 * reference metadata. Untyped 200 → this schema is the contract.
 */
export const EmployeePaymentResponseSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  kind: z.string(),
  amount: z.number(),
  loanRepaymentAmount: z.number().nullish(),
  method: z.string(),
  paidBy: z.string(),
  paidAt: z.string(),
  notes: z.string().nullish(),
  chequeNumber: z.string().nullish(),
  chequeBank: z.string().nullish(),
  chequeDueDate: z.string().nullish(),
  createdAt: z.string(),
});
export type EmployeePaymentResponse = z.infer<typeof EmployeePaymentResponseSchema>;

/**
 * Record an employee payment (POST /employees/{employeeId}/payments). The employee is taken from the
 * route, not the body. The wrapper mints the `id` + `idempotencyKey`. `loanRepaymentAmount` is only
 * valid on a `salary_payment` and never exceeds `amount`. Cheque metadata is stored only when `method`
 * is `cheque`.
 */
export const EmployeePaymentRequestSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["salary_payment", "loan", "loan_repayment", "deduction"]),
  amount: z.number().positive(),
  loanRepaymentAmount: z.number().min(0).optional(),
  method: z.enum(["cash", "card", "bank_transfer", "cheque"]),
  notes: optionalText,
  chequeNumber: z.string().trim().max(64).optional(),
  chequeBank: z.string().trim().max(128).optional(),
  // DateOnly on the wire ("YYYY-MM-DD").
  chequeDueDate: z.string().optional(),
  idempotencyKey: z.string().min(1).max(128),
});
export type EmployeePaymentRequest = z.infer<typeof EmployeePaymentRequestSchema>;
export type EmployeePaymentInput = Omit<EmployeePaymentRequest, "id" | "idempotencyKey">;

/** Query params for an employee's payment history — offset-paged. */
export interface EmployeePaymentListParams {
  skip?: number;
  take?: number;
}
