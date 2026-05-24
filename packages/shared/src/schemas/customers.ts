import { z } from "zod";

import { optionalText } from "./common";

/**
 * A customer row (GET /customers[/{id}]). `balance` + `ledgerStatus` are joined from the 1:1 ledger
 * server-side (BACKEND_PREREQS §3) so the list shows account state without an N+1 statement call.
 * **Positive `balance` = the customer owes the clinic.** Both are read-only — the ledger is
 * server-authoritative.
 */
export const CustomerResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  fullName: z.string(),
  phonePrimary: z.string().nullish(),
  phoneSecondary: z.string().nullish(),
  address: z.string().nullish(),
  email: z.string().nullish(),
  idNumber: z.string().nullish(),
  notes: z.string().nullish(),
  assignedDoctorId: z.string().nullish(),
  balance: z.number(),
  ledgerStatus: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomerResponse = z.infer<typeof CustomerResponseSchema>;

/**
 * Create + partial-update payload. Mirrors the backend Customer(Patch)Request validators (max
 * lengths; `type` ∈ the CustomerType enum). The wrapper mints the client GUID v7 `id`; optional
 * text left blank is stripped at submit (web `omitEmptyStrings`) so it stores as null, not "".
 * Note (W10 polish): on edit, omitting an optional field leaves it unchanged server-side — the
 * patch only writes present fields — so a doctor/optional value can't yet be cleared via edit.
 */
export const CustomerRequestSchema = z.object({
  type: z.enum(["regular_farm", "home", "cattle_farm", "poultry_farm"]),
  fullName: z.string().trim().min(1).max(256),
  phonePrimary: z.string().trim().max(32).optional(),
  phoneSecondary: z.string().trim().max(32).optional(),
  address: optionalText,
  email: z.string().trim().max(256).optional(),
  idNumber: z.string().trim().max(64).optional(),
  notes: optionalText,
  assignedDoctorId: z.string().optional(),
});
export type CustomerRequest = z.infer<typeof CustomerRequestSchema>;

/** Query params for the roster list — offset-paged (admin-table convention). */
export interface CustomerListParams {
  search?: string;
  type?: string;
  assignedDoctorId?: string;
  ledgerStatus?: string;
  skip?: number;
  take?: number;
}
