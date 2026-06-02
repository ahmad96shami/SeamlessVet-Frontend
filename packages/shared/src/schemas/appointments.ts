import { z } from "zod";

import { optionalText } from "./common";

/**
 * An appointment row (GET /appointments[/{id}]). A scheduled slot for a doctor, optionally tied to a
 * customer/pet/service. `scheduledAt` + `durationMin` define a half-open window `[start, start+dur)`
 * the backend uses for conflict detection (a null `durationMin` means the 30-min server default).
 * `visitId` is null until the appointment is *attended* — then POST /attend opens a clinic visit and
 * back-links it here. The list endpoint returns an untyped 200, so this schema is the contract.
 */
export const AppointmentResponseSchema = z.object({
  id: z.string(),
  customerId: z.string().nullish(),
  petId: z.string().nullish(),
  doctorId: z.string().nullish(),
  serviceId: z.string().nullish(),
  scheduledAt: z.string(),
  durationMin: z.number().nullish(),
  status: z.string(),
  notes: z.string().nullish(),
  visitId: z.string().nullish(),
  // M17 — follow-up scheduled from a visit (PRD §18.8).
  isFollowUp: z.boolean(),
  originVisitId: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AppointmentResponse = z.infer<typeof AppointmentResponseSchema>;

/**
 * Create payload (POST /appointments). Mirrors the backend `AppointmentCreateRequest` + validators:
 * only `scheduledAt` is required server-side; `durationMin` ∈ [1, 1440]; an appointment may only be
 * *created* `scheduled` or `confirmed` (terminal states go through the dedicated endpoints). The
 * wrapper mints the client GUID v7 `id`. The booking form layers its own requirements (a doctor +
 * customer) on top of this; if `petId` is given it must belong to `customerId` (server enforces —
 * 409 `pet_customer_mismatch`). Booking into an occupied slot → 409 `appointment_conflict`.
 */
export const AppointmentCreateRequestSchema = z.object({
  customerId: z.string().optional(),
  petId: z.string().optional(),
  doctorId: z.string().optional(),
  serviceId: z.string().optional(),
  scheduledAt: z.string().min(1),
  durationMin: z.number().int().min(1).max(1440).optional(),
  status: z.enum(["scheduled", "confirmed"]).optional(),
  notes: optionalText,
});
export type AppointmentCreateRequest = z.infer<typeof AppointmentCreateRequestSchema>;

/**
 * Reschedule / edit (PATCH /appointments/{id}). Every field optional — only supplied ones change.
 * Changing `doctorId` / `scheduledAt` / `durationMin` re-runs conflict detection server-side. `status`
 * may only move between `scheduled` ↔ `confirmed`; terminal transitions go through
 * POST /appointments/{id}/attend | /cancel | /no-show. Editing a terminal appointment is rejected
 * server-side (409 `appointment_locked`).
 */
export const AppointmentPatchRequestSchema = z.object({
  customerId: z.string().optional(),
  petId: z.string().optional(),
  doctorId: z.string().optional(),
  serviceId: z.string().optional(),
  scheduledAt: z.string().min(1).optional(),
  durationMin: z.number().int().min(1).max(1440).optional(),
  status: z.enum(["scheduled", "confirmed"]).optional(),
  notes: optionalText,
});
export type AppointmentPatchRequest = z.infer<typeof AppointmentPatchRequestSchema>;

/**
 * Schedule a follow-up from a visit (M17, POST /visits/{id}/schedule-follow-up). Customer + pet come
 * from the origin visit; `doctorId` defaults to the origin's doctor. Attending the resulting
 * appointment opens a visit with the checkup fee waived once per origin (PRD §18.8). Booking into an
 * occupied slot → 409 `appointment_conflict`.
 */
export const ScheduleFollowUpRequestSchema = z.object({
  scheduledAt: z.string().min(1),
  doctorId: z.string().optional(),
  durationMin: z.number().int().min(1).max(1440).optional(),
  notes: optionalText,
});
export type ScheduleFollowUpRequest = z.infer<typeof ScheduleFollowUpRequestSchema>;

/** Query params for the appointments list — offset-paged; ordered by `scheduledAt ASC` server-side. */
export interface AppointmentListParams {
  doctorId?: string;
  customerId?: string;
  petId?: string;
  status?: string;
  /** Inclusive lower bound on `scheduledAt` (ISO-8601). */
  from?: string;
  /** Inclusive upper bound on `scheduledAt` (ISO-8601). */
  to?: string;
  skip?: number;
  take?: number;
}
