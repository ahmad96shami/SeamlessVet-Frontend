import { z } from "zod";

import { optionalText } from "./common";

/** M16 — one farm's ledger state in the customer-detail breakdown (`farmLedgers[]`). */
export const CustomerFarmLedgerSchema = z.object({
  farmId: z.string(),
  farmName: z.string(),
  ledgerId: z.string(),
  balance: z.number(),
  status: z.string(),
  closedAt: z.string().nullish(),
});
export type CustomerFarmLedger = z.infer<typeof CustomerFarmLedgerSchema>;

/**
 * A customer row (GET /customers[/{id}]). **M16:** `balance` + `ledgerStatus` are the **aggregate**
 * across the customer's own ledger and all its farm ledgers (own + Σ farms). `ledgerStatus` is a
 * **settled rollup**: `has_debt` when the aggregate is positive, else `closed` when the customer's
 * own ledger is closed (a zero-balance farm ledger left open doesn't keep them open), else `open` —
 * so closing the customer's account shows `closed` even while a farm ledger is still open. `ownBalance`
 * is the own (non-farm) ledger alone; `ownLedgerStatus` is its status; `farmLedgers` is the per-farm
 * breakdown — populated by the single-customer detail read, null on the list.
 * **Positive `balance` = the customer owes the clinic.** All are read-only — the ledgers are
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
  ownBalance: z.number(),
  // The own (non-farm) ledger's status alone, vs. `ledgerStatus` (the aggregate). Lets a posting
  // client (e.g. the receipt voucher) tell an open own ledger from a closed one when the aggregate
  // reads open only because a farm ledger is open. Detail/list reads set it; legacy reads omit it.
  ownLedgerStatus: z.string().nullish(),
  farmLedgers: z.array(CustomerFarmLedgerSchema).nullish(),
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
  type: z.enum(["regular_farm", "home", "cattle_farm", "poultry_farm", "clinic_customer"]),
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
