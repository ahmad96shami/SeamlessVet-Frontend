import type { AxiosInstance } from "axios";
import { z } from "zod";

import {
  ApproveRegistrationRequestSchema,
  RegistrationRequestSummarySchema,
  RejectRegistrationRequestSchema,
  type ApproveRegistrationRequest,
  type RegistrationRequestSummary,
  type RejectRegistrationRequest,
} from "../schemas/registrationRequests";

const RegistrationRequestListSchema = z.array(RegistrationRequestSummarySchema);

/** GET /admin/registration-requests?status= — defaults to `pending` server-side. */
export async function listRegistrationRequests(
  client: AxiosInstance,
  params?: { status?: string },
): Promise<RegistrationRequestSummary[]> {
  const res = await client.get("/admin/registration-requests", { params });
  return RegistrationRequestListSchema.parse(res.data);
}

/** POST /admin/registration-requests/{id}/approve — activates the account with its requested role. */
export async function approveRegistrationRequest(
  client: AxiosInstance,
  id: string,
  body: ApproveRegistrationRequest = {},
): Promise<RegistrationRequestSummary> {
  const payload = ApproveRegistrationRequestSchema.parse(body);
  const res = await client.post(`/admin/registration-requests/${id}/approve`, payload);
  return RegistrationRequestSummarySchema.parse(res.data);
}

/** POST /admin/registration-requests/{id}/reject — records the rejection reason. */
export async function rejectRegistrationRequest(
  client: AxiosInstance,
  id: string,
  body: RejectRegistrationRequest,
): Promise<RegistrationRequestSummary> {
  const payload = RejectRegistrationRequestSchema.parse(body);
  const res = await client.post(`/admin/registration-requests/${id}/reject`, payload);
  return RegistrationRequestSummarySchema.parse(res.data);
}
