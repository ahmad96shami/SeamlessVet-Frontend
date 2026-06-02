import { z } from "zod";

import { optionalText } from "./common";

/**
 * A night-stay (مبيت, PRD §18.6, M17) — a hospitalized boarding episode. Clinic-only (the server
 * rejects field visits). Created **open** (no check-out, nothing billed); `nightlyRate` is snapshotted
 * by `careType` at creation. Closing it (POST /night-stays/{id}/close) counts nights hotel-style and
 * posts the `night_stay` ledger entry (`nightsCount × nightlyRate`). The list endpoint returns an
 * untyped 200, so this schema is the contract.
 */
export const NightStayResponseSchema = z.object({
  id: z.string(),
  visitId: z.string(),
  careType: z.string(),
  checkInAt: z.string(),
  checkOutAt: z.string().nullish(),
  nightsCount: z.number().int(),
  nightlyRate: z.number(),
  total: z.number(),
  notes: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type NightStayResponse = z.infer<typeof NightStayResponseSchema>;

/**
 * Create payload (POST /night-stays). `careType` ∈ CareType; `checkInAt` defaults to now server-side
 * when omitted; omit `nightlyRate` to snapshot the settings rate for the care type. The wrapper mints
 * the client GUID v7 `id`.
 */
export const NightStayCreateRequestSchema = z.object({
  visitId: z.string().min(1),
  careType: z.enum(["medical", "icu", "hotel"]),
  checkInAt: z.string().optional(),
  nightlyRate: z.number().nonnegative().optional(),
  notes: optionalText,
});
export type NightStayCreateRequest = z.infer<typeof NightStayCreateRequestSchema>;

/** Partial edit of an **open** stay (PATCH /night-stays/{id}). Billing fields freeze once closed. */
export const NightStayPatchRequestSchema = z.object({
  careType: z.enum(["medical", "icu", "hotel"]).optional(),
  checkInAt: z.string().optional(),
  nightlyRate: z.number().nonnegative().optional(),
  notes: optionalText,
});
export type NightStayPatchRequest = z.infer<typeof NightStayPatchRequestSchema>;

/** Close payload (POST /night-stays/{id}/close). `checkOutAt` defaults to now when omitted. */
export const NightStayCloseRequestSchema = z.object({
  checkOutAt: z.string().optional(),
});
export type NightStayCloseRequest = z.infer<typeof NightStayCloseRequestSchema>;

export interface NightStayListParams {
  visitId?: string;
  skip?: number;
  take?: number;
}
