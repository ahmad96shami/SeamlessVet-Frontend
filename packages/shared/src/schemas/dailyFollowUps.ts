import { z } from "zod";

import { optionalText } from "./common";

/**
 * A daily follow-up entry for a hospitalized case (PRD §5.2-E). Clinic-only — the server rejects
 * creation against a field visit. One entry per day with the day's vitals + administered meds.
 */
export const DailyFollowUpResponseSchema = z.object({
  id: z.string(),
  visitId: z.string(),
  entryDate: z.string(), // DateOnly → "yyyy-MM-dd"
  condition: z.string().nullish(),
  temperature: z.number().nullish(),
  heartRate: z.number().nullish(),
  respiratoryRate: z.number().nullish(),
  administeredMeds: z.string().nullish(),
  notes: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DailyFollowUpResponse = z.infer<typeof DailyFollowUpResponseSchema>;

/** Create payload (POST /daily-follow-ups). `entryDate` is a required "yyyy-MM-dd" date. */
export const DailyFollowUpCreateRequestSchema = z.object({
  visitId: z.string().min(1),
  entryDate: z.string().min(1),
  condition: optionalText,
  temperature: z.number().nonnegative().optional(),
  heartRate: z.number().int().nonnegative().optional(),
  respiratoryRate: z.number().int().nonnegative().optional(),
  administeredMeds: optionalText,
  notes: optionalText,
});
export type DailyFollowUpCreateRequest = z.infer<typeof DailyFollowUpCreateRequestSchema>;

/** Partial update (PATCH /daily-follow-ups/{id}). */
export const DailyFollowUpPatchRequestSchema = z.object({
  entryDate: z.string().min(1).optional(),
  condition: optionalText,
  temperature: z.number().nonnegative().optional(),
  heartRate: z.number().int().nonnegative().optional(),
  respiratoryRate: z.number().int().nonnegative().optional(),
  administeredMeds: optionalText,
  notes: optionalText,
});
export type DailyFollowUpPatchRequest = z.infer<typeof DailyFollowUpPatchRequestSchema>;

export interface DailyFollowUpListParams {
  visitId?: string;
  skip?: number;
  take?: number;
}
