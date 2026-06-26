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
  // Intended discharge hour 0–23, recorded at creation — informational only (never affects billing).
  exitHour: z.number().int().nullish(),
  notes: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // M23 — derived: the boarding charge is billed, via a POS invoice line (back-link) OR the
  // visit-completion ledger backstop (key night-stay-{id}). Drives the «مُفوترة» badge + lock on the
  // night-stays tab and the POS cart. `.default(false)` keeps an older backend that omits it parsing
  // as "not billed" rather than throwing.
  billed: z.boolean().default(false),
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
  exitHour: z.number().int().min(0).max(23).optional(),
  notes: optionalText,
});
export type NightStayCreateRequest = z.infer<typeof NightStayCreateRequestSchema>;

/** Partial edit of an **open** stay (PATCH /night-stays/{id}). Billing fields freeze once closed. */
export const NightStayPatchRequestSchema = z.object({
  careType: z.enum(["medical", "icu", "hotel"]).optional(),
  checkInAt: z.string().optional(),
  nightlyRate: z.number().nonnegative().optional(),
  exitHour: z.number().int().min(0).max(23).optional(),
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
