import { z } from "zod";

import { OPERATING_EXPENSE_CATEGORY_VALUES } from "../enums";
import { optionalText } from "./common";

/** A row in the operating-expenses list (GET /operating-expenses). `incurredOn` is a `YYYY-MM-DD` date. */
export const OperatingExpenseResponseSchema = z.object({
  id: z.string(),
  category: z.string(),
  amount: z.number(),
  incurredOn: z.string(),
  paid: z.boolean(),
  paidAt: z.string().nullish(),
  note: z.string().nullish(),
  createdAt: z.string(),
});
export type OperatingExpenseResponse = z.infer<typeof OperatingExpenseResponseSchema>;

const CategoryEnum = z.enum(
  OPERATING_EXPENSE_CATEGORY_VALUES as unknown as [string, ...string[]],
);

/** POST /operating-expenses — the wrapper mints a client GUID v7 `id`. */
export const CreateOperatingExpenseRequestSchema = z.object({
  category: CategoryEnum,
  amount: z.number().positive(),
  incurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid_date"),
  paid: z.boolean(),
  note: optionalText,
});
export type CreateOperatingExpenseRequest = z.infer<typeof CreateOperatingExpenseRequestSchema>;

/** PATCH /operating-expenses/{id} — partial update (null/omitted fields unchanged). */
export const UpdateOperatingExpenseRequestSchema = z.object({
  category: CategoryEnum.optional(),
  amount: z.number().positive().optional(),
  incurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid_date").optional(),
  paid: z.boolean().optional(),
  note: optionalText,
});
export type UpdateOperatingExpenseRequest = z.infer<typeof UpdateOperatingExpenseRequestSchema>;

/** Query params for the operating-expenses list — filters category / from / to / paid. */
export interface OperatingExpenseListParams {
  category?: string;
  from?: string;
  to?: string;
  paid?: boolean;
  skip?: number;
  take?: number;
}
