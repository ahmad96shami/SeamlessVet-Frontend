import type { AxiosInstance } from "axios";

import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  SystemSettingsPatchRequestSchema,
  SystemSettingsResponseSchema,
  type SystemSettingsPatchRequest,
  type SystemSettingsResponse,
} from "../schemas/systemSettings";

/** GET /admin/settings — the per-environment settings singleton. */
export async function getSystemSettings(client: AxiosInstance): Promise<SystemSettingsResponse> {
  const res = await client.get("/admin/settings");
  return SystemSettingsResponseSchema.parse(res.data);
}

/** PATCH /admin/settings — partial update; returns the singleton's id. */
export async function updateSystemSettings(
  client: AxiosInstance,
  body: SystemSettingsPatchRequest,
): Promise<IdentifierResponse> {
  const payload = SystemSettingsPatchRequestSchema.parse(body);
  const res = await client.patch("/admin/settings", payload);
  return IdentifierResponseSchema.parse(res.data);
}
