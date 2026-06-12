import { z } from "zod";

/**
 * An employee-ledger entry (append-only) — M31 (SCHEMA §4). The HR mirror of a supplier LedgerEntry.
 * `amount` is **signed**: positive raises the payable (`salary_accrual` posted by the monthly job, or a
 * `loan_repayment`), negative reduces it (`salary_payment`, or a `loan` which drives the balance
 * negative). `balanceAfter` is the running balance immediately after this entry (positive = the clinic
 * owes the employee). `entryType` ∈ salary_accrual | salary_payment | loan | loan_repayment |
 * adjustment. `employeePaymentId` back-links the source payment (an accrual + an adjustment have none).
 */
export const EmployeeLedgerEntryResponseSchema = z.object({
  id: z.string(),
  employeeLedgerId: z.string(),
  entryType: z.string(),
  amount: z.number(),
  balanceAfter: z.number(),
  employeePaymentId: z.string().nullish(),
  description: z.string().nullish(),
  idempotencyKey: z.string(),
  createdAt: z.string(),
});
export type EmployeeLedgerEntryResponse = z.infer<typeof EmployeeLedgerEntryResponseSchema>;

/**
 * Employee HR-account statement (GET /employees/{id}/statement) — the HR mirror of the supplier
 * statement. `openingBalance` is the running balance just before `from` (0 when no `from`);
 * `closingBalance` is the balance after the last entry in range. Positive balances = the clinic owes the
 * employee unpaid salary; negative = the employee owes a loan. Untyped 200 → this schema is the contract.
 */
export const EmployeeStatementResponseSchema = z.object({
  employeeId: z.string(),
  fullName: z.string(),
  ledgerId: z.string(),
  openingBalance: z.number(),
  closingBalance: z.number(),
  status: z.string(),
  from: z.string().nullish(),
  to: z.string().nullish(),
  entries: z.array(EmployeeLedgerEntryResponseSchema),
});
export type EmployeeStatementResponse = z.infer<typeof EmployeeStatementResponseSchema>;

/** `from`/`to` are ISO-8601 instants (the backend binds DateTimeOffset); inclusive of the bounds. */
export interface EmployeeStatementParams {
  from?: string;
  to?: string;
}
