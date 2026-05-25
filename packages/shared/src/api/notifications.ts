import type { AxiosInstance } from "axios";
import { z } from "zod";

import {
  NotificationResponseSchema,
  type NotificationListParams,
  type NotificationResponse,
} from "../schemas/notifications";

const NotificationListSchema = z.array(NotificationResponseSchema);

/**
 * GET /notifications — the caller's own feed, newest first; offset-paged via `skip`/`take`.
 * `?unreadOnly=true` filters to unread rows (used for the bell's badge count). Auth-only — the
 * server scopes rows to the authenticated user, so no permission key is required.
 */
export async function listNotifications(
  client: AxiosInstance,
  params?: NotificationListParams,
): Promise<NotificationResponse[]> {
  const res = await client.get("/notifications", { params });
  return NotificationListSchema.parse(res.data);
}

/**
 * POST /notifications/{id}/read — mark a single notification read. Idempotent (re-reading an
 * already-read row is a no-op). Returns the updated row (its `readAt` now set).
 */
export async function markNotificationRead(
  client: AxiosInstance,
  id: string,
): Promise<NotificationResponse> {
  const res = await client.post(`/notifications/${id}/read`);
  return NotificationResponseSchema.parse(res.data);
}
