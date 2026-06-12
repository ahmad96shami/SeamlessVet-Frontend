import { z } from "zod";

import { optionalText } from "./common";

/**
 * A doctor-partner row (GET /doctor-partners[/{id}]) — M30 (SCHEMA §4). The AP payee for the
 * supervision fees a field doctor earns: settling a supervision batch credits the responsible doctor's
 * partner ledger. The AP mirror of a {@link SupplierResponse} (one partner ↔ one ledger), but **distinct
 * from the M10 investor partner** (profit shares). `doctorName` is resolved from the **mandatory** linked
 * user (not stored). `balance` + `ledgerStatus` are that ledger's state — **positive `balance` = the
 * clinic owes the doctor**. Both read-only (the ledger is server-authoritative). Untyped 200 → this
 * schema is the contract.
 */
export const DoctorPartnerResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  doctorName: z.string(),
  notes: z.string().nullish(),
  balance: z.number(),
  ledgerStatus: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DoctorPartnerResponse = z.infer<typeof DoctorPartnerResponseSchema>;

/**
 * Create payload (POST /doctor-partners). `userId` is the **mandatory** staff account this partner pays
 * (one partner per user — the server rejects a duplicate with 409 `doctor_partner_user_taken`). The
 * wrapper mints the client GUID v7 `id`; the matching ledger is seeded server-side.
 */
export const DoctorPartnerCreateRequestSchema = z.object({
  userId: z.string().min(1),
  notes: optionalText,
});
export type DoctorPartnerCreateRequest = z.infer<typeof DoctorPartnerCreateRequestSchema>;

/**
 * Term edit (PATCH /doctor-partners/{id}). Only `notes` is editable — the `userId` link is fixed on
 * create (re-linking would orphan the ledger). Omitting `notes` leaves it unchanged server-side.
 */
export const DoctorPartnerPatchRequestSchema = z.object({
  notes: optionalText,
});
export type DoctorPartnerPatchRequest = z.infer<typeof DoctorPartnerPatchRequestSchema>;

/** Query params for the doctor-partner roster — offset-paged; filters search (doctor name) / ledgerStatus. */
export interface DoctorPartnerListParams {
  search?: string;
  ledgerStatus?: string;
  skip?: number;
  take?: number;
}
