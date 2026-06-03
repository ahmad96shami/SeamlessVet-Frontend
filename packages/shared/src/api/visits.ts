import type { AxiosInstance } from "axios";
import { z } from "zod";

import { idempotencyKey, newGuidV7 } from "../http/idempotency";
import { sendRequest, type RequestDescriptor } from "../offline/queue";
import { ScheduleFollowUpRequestSchema, type ScheduleFollowUpRequest } from "../schemas/appointments";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  VisitCreateRequestSchema,
  VisitPatchRequestSchema,
  VisitResponseSchema,
  type VisitCreateRequest,
  type VisitListParams,
  type VisitPatchRequest,
  type VisitResponse,
} from "../schemas/visits";

const VisitListSchema = z.array(VisitResponseSchema);

// Create mints the client GUID v7 `id` + a stable idempotency key once, via a RequestDescriptor —
// so the online path and the offline write-queue replay the IDENTICAL request (W7). Screens that
// must work offline build the descriptor and route it through sendOrQueue; the wrapper below is the
// plain online path (build → send).

/** GET /visits — offset-paged; filters customerId / petId / doctorId / status. */
export async function listVisits(
  client: AxiosInstance,
  params?: VisitListParams,
): Promise<VisitResponse[]> {
  const res = await client.get("/visits", { params });
  return VisitListSchema.parse(res.data);
}

/** GET /visits/{id} — a single visit with all clinical sections. */
export async function getVisit(client: AxiosInstance, id: string): Promise<VisitResponse> {
  const res = await client.get(`/visits/${id}`);
  return VisitResponseSchema.parse(res.data);
}

/**
 * Build the `POST /visits` request — mints the client GUID v7 `id` + a stable idempotency key.
 * `descriptor.entityId` is that `id` (so an offline caller can optimistically render/navigate
 * before the row reaches the server).
 */
export function buildCreateVisitRequest(body: VisitCreateRequest): RequestDescriptor {
  const payload = VisitCreateRequestSchema.parse(body);
  const id = newGuidV7();
  return {
    method: "POST",
    url: "/visits",
    body: { ...payload, id },
    idempotencyKey: idempotencyKey(),
    label: "sync.label.newVisit",
    entityKind: "visit",
    entityId: id,
  };
}

/** POST /visits — create (status defaults to `open`; `visit_number` left null server-side). */
export async function createVisit(
  client: AxiosInstance,
  body: VisitCreateRequest,
): Promise<IdentifierResponse> {
  const data = await sendRequest(client, buildCreateVisitRequest(body));
  return IdentifierResponseSchema.parse(data);
}

/** PATCH /visits/{id} — section-level update (non-terminal; `id` lives in the URL). */
export async function updateVisit(
  client: AxiosInstance,
  id: string,
  body: VisitPatchRequest,
): Promise<IdentifierResponse> {
  const payload = VisitPatchRequestSchema.parse(body);
  const res = await client.patch(`/visits/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** POST /visits/{id}/complete — terminal transition (idempotent); stamps `ended_at`. */
export async function completeVisit(client: AxiosInstance, id: string): Promise<IdentifierResponse> {
  const res = await client.post(`/visits/${id}/complete`);
  return IdentifierResponseSchema.parse(res.data);
}

/** POST /visits/{id}/cancel — terminal transition (idempotent); stamps `ended_at`. */
export async function cancelVisit(client: AxiosInstance, id: string): Promise<IdentifierResponse> {
  const res = await client.post(`/visits/${id}/cancel`);
  return IdentifierResponseSchema.parse(res.data);
}

/**
 * Build the `POST /visits/{visitId}/schedule-follow-up` request (M17) — mints the appointment
 * GUID v7 `id` once, so an offline replay is at-most-once: the endpoint doesn't dedupe on the
 * idempotency header, but a re-send of the same `id` 409s (`appointment_id_collision`) instead
 * of double-booking (it parks as a dismissable conflict, never a duplicate). A genuine slot
 * clash parks the same way (`appointment_conflict`).
 */
export function buildScheduleFollowUpRequest(
  visitId: string,
  input: ScheduleFollowUpRequest,
): RequestDescriptor {
  const id = newGuidV7();
  const body = { ...ScheduleFollowUpRequestSchema.parse(input), id };
  return {
    method: "POST",
    url: `/visits/${visitId}/schedule-follow-up`,
    body,
    idempotencyKey: idempotencyKey(),
    label: "sync.label.followUp",
    entityKind: "appointment",
    entityId: id,
  };
}

/**
 * POST /visits/{id}/schedule-follow-up — books a follow-up appointment from this visit (M17). Returns
 * the new appointment's id; attending it later waives the checkup fee once per origin (PRD §18.8).
 */
export async function scheduleFollowUp(
  client: AxiosInstance,
  visitId: string,
  body: ScheduleFollowUpRequest,
): Promise<IdentifierResponse> {
  const data = await sendRequest(client, buildScheduleFollowUpRequest(visitId, body));
  return IdentifierResponseSchema.parse(data);
}
