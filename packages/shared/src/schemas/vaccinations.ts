import { z } from "zod";

import { optionalText } from "./common";

/**
 * A vaccination record (PRD §5.2, §6.7). Recipient is either a single pet (`petId`) or a farm group
 * (`customerId`) — at least one is required. `nextDueDate` drives the M11 reminder job.
 * `certificateUrl` may hold a generated/attached certificate reference.
 */
export const VaccinationResponseSchema = z.object({
  id: z.string(),
  petId: z.string().nullish(),
  customerId: z.string().nullish(),
  visitId: z.string().nullish(),
  vaccineType: z.string(),
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
 */
export const VaccinationCreateRequestSchema = z.object({
  petId: z.string().optional(),
  customerId: z.string().optional(),
  visitId: z.string().optional(),
  vaccineType: z.string().trim().min(1).max(128),
  dateGiven: z.string().min(1),
  nextDueDate: z.string().optional(),
  certificateUrl: optionalText,
});
export type VaccinationCreateRequest = z.infer<typeof VaccinationCreateRequestSchema>;

/** Partial update (PATCH /vaccinations/{id}). */
export const VaccinationPatchRequestSchema = z.object({
  vaccineType: z.string().trim().min(1).max(128).optional(),
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
