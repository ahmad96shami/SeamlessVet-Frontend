import { z } from "zod";

import { optionalText } from "./common";

/**
 * A supplier row (GET /suppliers[/{id}]) — M19 (SCHEMA §4). The AP mirror of a customer: each supplier
 * owns exactly one supplier ledger. `balance` + `ledgerStatus` are that ledger's state — **positive
 * `balance` = the clinic owes the supplier** (an outstanding payable). Both are read-only (the ledger
 * is server-authoritative, derived from append-only entries). The list endpoint returns an untyped
 * 200, so this schema is the contract.
 */
export const SupplierResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  phonePrimary: z.string().nullish(),
  phoneSecondary: z.string().nullish(),
  address: z.string().nullish(),
  email: z.string().nullish(),
  taxNumber: z.string().nullish(),
  notes: z.string().nullish(),
  balance: z.number(),
  ledgerStatus: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SupplierResponse = z.infer<typeof SupplierResponseSchema>;

/**
 * Create + partial-update payload (mirrors the backend Supplier(Patch)Request validators). The wrapper
 * mints the client GUID v7 `id`; optional text left blank is stripped at submit (web `omitEmptyStrings`)
 * so it stores as null, not "". As with customers (W10 note), omitting an optional field on edit leaves
 * it unchanged server-side.
 */
export const SupplierRequestSchema = z.object({
  name: z.string().trim().min(1).max(256),
  phonePrimary: z.string().trim().max(32).optional(),
  phoneSecondary: z.string().trim().max(32).optional(),
  address: optionalText,
  email: z.string().trim().max(256).optional(),
  taxNumber: z.string().trim().max(64).optional(),
  notes: optionalText,
});
export type SupplierRequest = z.infer<typeof SupplierRequestSchema>;

/** Query params for the supplier roster — offset-paged; filters search / ledgerStatus. */
export interface SupplierListParams {
  search?: string;
  ledgerStatus?: string;
  skip?: number;
  take?: number;
}
