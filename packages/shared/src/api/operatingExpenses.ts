import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import {
  CreateOperatingExpenseRequestSchema,
  OperatingExpenseResponseSchema,
  UpdateOperatingExpenseRequestSchema,
  type CreateOperatingExpenseRequest,
  type OperatingExpenseListParams,
  type OperatingExpenseResponse,
  type UpdateOperatingExpenseRequest,
} from "../schemas/operatingExpenses";

const OperatingExpenseListSchema = z.array(OperatingExpenseResponseSchema);

// Operating expenses (water/electricity/rent/…). Online-only center-web, gated on operating_expenses.manage.
// The wrapper mints the client GUID v7 `id` so screens never handle ids (the suppliers convention).

/** GET /operating-expenses — offset-paged; filters category / from / to / paid. */
export async function listOperatingExpenses(
  client: AxiosInstance,
  params?: OperatingExpenseListParams,
): Promise<OperatingExpenseResponse[]> {
  const res = await client.get("/operating-expenses", { params });
  return OperatingExpenseListSchema.parse(res.data);
}

/** POST /operating-expenses — create (mints a client GUID v7 id). */
export async function createOperatingExpense(
  client: AxiosInstance,
  body: CreateOperatingExpenseRequest,
): Promise<OperatingExpenseResponse> {
  const payload = CreateOperatingExpenseRequestSchema.parse(body);
  const res = await client.post("/operating-expenses", { ...payload, id: newGuidV7() });
  return OperatingExpenseResponseSchema.parse(res.data);
}

/** PATCH /operating-expenses/{id} — partial update (`id` lives in the URL). */
export async function updateOperatingExpense(
  client: AxiosInstance,
  id: string,
  body: UpdateOperatingExpenseRequest,
): Promise<OperatingExpenseResponse> {
  const payload = UpdateOperatingExpenseRequestSchema.parse(body);
  const res = await client.patch(`/operating-expenses/${id}`, payload);
  return OperatingExpenseResponseSchema.parse(res.data);
}

/** DELETE /operating-expenses/{id} — soft delete. */
export async function deleteOperatingExpense(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/operating-expenses/${id}`);
}
