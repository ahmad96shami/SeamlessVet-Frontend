import { z } from "zod";

import { optionalText } from "./common";

/**
 * A vaccination record (PRD §5.2, §6.7). Recipient is either a single pet (`petId`) or a farm group
 * (`customerId`) — at least one is required. `nextDueDate` drives the M11 reminder job.
 * `certificateUrl` may hold a generated/attached certificate reference. M26: `productId` links the
 * catalog vaccine (a product with category `vaccine`) and `price` snapshots the charge at recording
 * time — a product-linked vaccination is administered on create (FEFO stock deduct) and billable as
 * a product line on a visit; `resolvedUnitCost` is the server-captured weighted-avg lot cost (for
 * profit reporting). Legacy free-text rows (`productId` null) stay records-only.
 */
export const VaccinationResponseSchema = z.object({
  id: z.string(),
  petId: z.string().nullish(),
  customerId: z.string().nullish(),
  visitId: z.string().nullish(),
  productId: z.string().nullish(),
  vaccineType: z.string(),
  price: z.number().nullish(),
  resolvedUnitCost: z.number().nullish(),
  dateGiven: z.string(), // DateOnly → "yyyy-MM-dd"
  nextDueDate: z.string().nullish(),
  certificateUrl: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type VaccinationResponse = z.infer<typeof VaccinationResponseSchema>;

/**
 * Create payload (POST /vaccinations). `vaccineType` + `dateGiven` required; `nextDueDate`, if set,
 * must be on/after `dateGiven` (server-enforced). Caller supplies `petId` (and/or `customerId`).
 * M26: `productId` links a catalog vaccine (a product with category `vaccine`) — the server rejects
 * a non-vaccine product (`product_not_vaccine`) and administers it on create (FEFO stock deduct);
 * `vaccineType` snapshots the picked vaccine's name; `price` omitted defaults to the catalog selling
 * price server-side.
 */
export const VaccinationCreateRequestSchema = z.object({
  petId: z.string().optional(),
  customerId: z.string().optional(),
  visitId: z.string().optional(),
  productId: z.string().optional(),
  vaccineType: z.string().trim().min(1).max(128),
  price: z.number().min(0).optional(),
  dateGiven: z.string().min(1),
  nextDueDate: z.string().optional(),
  certificateUrl: optionalText,
});
export type VaccinationCreateRequest = z.infer<typeof VaccinationCreateRequestSchema>;

/** Partial update (PATCH /vaccinations/{id}). M26: the catalog link is immutable once recorded
 *  (`vaccination_product_immutable` — stock already moved), and a billed vaccination's `price` is
 *  frozen server-side (`vaccination_billed` 409); date/certificate patches still apply. */
export const VaccinationPatchRequestSchema = z.object({
  productId: z.string().optional(),
  vaccineType: z.string().trim().min(1).max(128).optional(),
  price: z.number().min(0).optional(),
  dateGiven: z.string().min(1).optional(),
  nextDueDate: z.string().optional(),
  certificateUrl: optionalText,
});
export type VaccinationPatchRequest = z.infer<typeof VaccinationPatchRequestSchema>;

export interface VaccinationListParams {
  petId?: string;
  customerId?: string;
  visitId?: string;
  skip?: number;
  take?: number;
}

/**
 * GET /vaccinations/upcoming params (M18 task 6). Lists vaccinations whose `nextDueDate` falls in the
 * range, soonest first; `from` defaults server-side to today. `from`/`to` are `DateOnly` ("yyyy-MM-dd")
 * — drive a calendar view by passing the visible window. Auth-only (distinct from the admin-gated
 * `/reports/upcoming-vaccinations`).
 */
export interface VaccinationUpcomingParams {
  from?: string;
  to?: string;
  petId?: string;
  customerId?: string;
  skip?: number;
  take?: number;
}
