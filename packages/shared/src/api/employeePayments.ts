import type { AxiosInstance } from "axios";
import { z } from "zod";

import { idempotencyKey, newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  EmployeePaymentRequestSchema,
  EmployeePaymentResponseSchema,
  type EmployeePaymentInput,
  type EmployeePaymentListParams,
  type EmployeePaymentResponse,
} from "../schemas/employeePayments";

const EmployeePaymentListSchema = z.array(EmployeePaymentResponseSchema);

// M31 employee payments are online-only center-web. Recording one mints the GUID v7 `id` + one
// idempotency key, sent in the body (row-level dedup); the host apiClient injects the `Idempotency-Key`
// header (request-level dedup) on POST. The employee is taken from the route.

/** GET /employees/{employeeId}/payments — an employee's payment history, offset-paged. */
export async function listEmployeePayments(
  client: AxiosInstance,
  employeeId: string,
  params?: EmployeePaymentListParams,
): Promise<EmployeePaymentResponse[]> {
  const res = await client.get(`/employees/${employeeId}/payments`, { params });
  return EmployeePaymentListSchema.parse(res.data);
}

/**
 * POST /employees/{employeeId}/payments — record an employee payment; posts the signed ledger entry per
 * `kind` (a salary_payment may carry a `loanRepaymentAmount` to repay a loan out of that salary). A
 * `cheque` payment settles immediately and stores its optional reference metadata. Returns only `{ id }`.
 */
export async function recordEmployeePayment(
  client: AxiosInstance,
  employeeId: string,
  input: EmployeePaymentInput,
): Promise<IdentifierResponse> {
  const body = EmployeePaymentRequestSchema.parse({
    ...input,
    id: newGuidV7(),
    idempotencyKey: idempotencyKey(),
  });
  const res = await client.post(`/employees/${employeeId}/payments`, body);
  return IdentifierResponseSchema.parse(res.data);
}
