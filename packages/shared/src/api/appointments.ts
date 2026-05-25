import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  AppointmentCreateRequestSchema,
  AppointmentPatchRequestSchema,
  AppointmentResponseSchema,
  type AppointmentCreateRequest,
  type AppointmentListParams,
  type AppointmentPatchRequest,
  type AppointmentResponse,
} from "../schemas/appointments";

const AppointmentListSchema = z.array(AppointmentResponseSchema);

// Mutations carry the `Idempotency-Key` header automatically (the host apiClient injects it on
// POST/PATCH); the create wrapper mints the client GUID v7 `id` so screens never handle ids.

/** GET /appointments — offset-paged; filters doctorId / customerId / petId / status / from / to. */
export async function listAppointments(
  client: AxiosInstance,
  params?: AppointmentListParams,
): Promise<AppointmentResponse[]> {
  const res = await client.get("/appointments", { params });
  return AppointmentListSchema.parse(res.data);
}

/** GET /appointments/{id} — a single appointment (incl. `visitId` once attended). */
export async function getAppointment(
  client: AxiosInstance,
  id: string,
): Promise<AppointmentResponse> {
  const res = await client.get(`/appointments/${id}`);
  return AppointmentResponseSchema.parse(res.data);
}

/** POST /appointments — book a slot (status defaults to `scheduled`). 409 on an overlapping slot. */
export async function createAppointment(
  client: AxiosInstance,
  body: AppointmentCreateRequest,
): Promise<IdentifierResponse> {
  const payload = AppointmentCreateRequestSchema.parse(body);
  const res = await client.post("/appointments", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /appointments/{id} — reschedule/edit (re-runs conflict detection; `id` lives in the URL). */
export async function updateAppointment(
  client: AxiosInstance,
  id: string,
  body: AppointmentPatchRequest,
): Promise<IdentifierResponse> {
  const payload = AppointmentPatchRequestSchema.parse(body);
  const res = await client.patch(`/appointments/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/**
 * POST /appointments/{id}/attend — mark attended; opens a clinic visit in the same transaction and
 * back-links it (the appointment's `visitId`). Idempotent. Requires both a customer and a doctor on
 * the appointment (else 409 `appointment_incomplete`). Returns the appointment id — re-fetch to read
 * the new `visitId`.
 */
export async function attendAppointment(
  client: AxiosInstance,
  id: string,
): Promise<IdentifierResponse> {
  const res = await client.post(`/appointments/${id}/attend`);
  return IdentifierResponseSchema.parse(res.data);
}

/** POST /appointments/{id}/cancel — terminal transition (idempotent). */
export async function cancelAppointment(
  client: AxiosInstance,
  id: string,
): Promise<IdentifierResponse> {
  const res = await client.post(`/appointments/${id}/cancel`);
  return IdentifierResponseSchema.parse(res.data);
}

/** POST /appointments/{id}/no-show — terminal transition (idempotent). */
export async function noShowAppointment(
  client: AxiosInstance,
  id: string,
): Promise<IdentifierResponse> {
  const res = await client.post(`/appointments/${id}/no-show`);
  return IdentifierResponseSchema.parse(res.data);
}
