import { z } from "zod";

import { optionalText } from "./common";

/**
 * An employee row (GET /employees[/{id}]) — M31 (SCHEMA §4). The HR payee for monthly salary accruals
 * and loans: the third mirror of the Supplier ledger triad (after suppliers + doctor-partners), one
 * employee ↔ one ledger. `userId` is the **optional** staff account this employee maps to (null for a
 * non-user employee such as a janitor/driver). `balance` + `ledgerStatus` are that ledger's state —
 * **positive `balance` = the clinic owes unpaid salary**, negative = an outstanding loan. The ledger
 * fields are read-only (server-authoritative). Untyped 200 → this schema is the contract.
 */
export const EmployeeResponseSchema = z.object({
  id: z.string(),
  userId: z.string().nullish(),
  fullName: z.string(),
  jobTitle: z.string().nullish(),
  monthlySalary: z.number(),
  active: z.boolean(),
  // DateOnly on the wire ("YYYY-MM-DD").
  hiredAt: z.string().nullish(),
  notes: z.string().nullish(),
  balance: z.number(),
  ledgerStatus: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EmployeeResponse = z.infer<typeof EmployeeResponseSchema>;

/**
 * Create payload (POST /employees). `userId` is the **optional** staff account this employee maps to
 * (unique per environment when present — the server rejects a duplicate with 409
 * `employee_user_taken`). The wrapper mints the client GUID v7 `id`; the matching ledger is seeded
 * server-side.
 */
export const EmployeeCreateRequestSchema = z.object({
  userId: z.string().min(1).optional(),
  fullName: z.string().trim().min(1).max(200),
  jobTitle: z.string().trim().max(120).optional(),
  monthlySalary: z.number().min(0),
  active: z.boolean(),
  // DateOnly on the wire ("YYYY-MM-DD").
  hiredAt: z.string().optional(),
  notes: optionalText,
});
export type EmployeeCreateRequest = z.infer<typeof EmployeeCreateRequestSchema>;

/**
 * Term edit (PATCH /employees/{id}). Every field is patchable except the `userId` link, which is fixed
 * on create (re-linking would orphan the ledger). Omitting a field leaves it unchanged server-side.
 */
export const EmployeePatchRequestSchema = z.object({
  fullName: z.string().trim().min(1).max(200).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  monthlySalary: z.number().min(0).optional(),
  active: z.boolean().optional(),
  hiredAt: z.string().optional(),
  notes: optionalText,
});
export type EmployeePatchRequest = z.infer<typeof EmployeePatchRequestSchema>;

/** Query params for the employee roster — offset-paged; filters search (name) / ledgerStatus / active. */
export interface EmployeeListParams {
  search?: string;
  ledgerStatus?: string;
  active?: boolean;
  skip?: number;
  take?: number;
}
