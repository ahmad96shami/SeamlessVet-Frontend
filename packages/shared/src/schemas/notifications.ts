import { z } from "zod";

/**
 * An in-app notification row (GET /notifications, the SignalR `ReceiveNotification` push, and the
 * POST /notifications/{id}/read response all share this shape — the backend `NotificationPayload`).
 * Self-scoped: a user only ever sees their own rows. `type` is a {@link NotificationType} wire value
 * (e.g. `negative_stock`, `account_ready_for_settlement`, `entitlement_approved`); `title`/`body` are
 * the rendered Arabic copy from the server; `payload` is an optional, type-specific JSON blob (ids to
 * deep-link to). `readAt` is null until the row is marked read. Both the feed and the hub return an
 * untyped 200, so this schema is the contract.
 */
export const NotificationResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string().nullish(),
  body: z.string().nullish(),
  payload: z.unknown().nullish(),
  createdAt: z.string(),
  readAt: z.string().nullish(),
});
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;

/** Query params for the feed — offset-paged, ordered `createdAt DESC` server-side. */
export interface NotificationListParams {
  /** Only return rows whose `readAt` is null. */
  unreadOnly?: boolean;
  skip?: number;
  /** Clamped to [1, 100] server-side (default 50). */
  take?: number;
}
