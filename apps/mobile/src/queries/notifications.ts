import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ApiError,
  listNotifications,
  markNotificationRead,
  type NotificationResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

/**
 * Mo7.2 — the notifications feed, mirroring web W10's `queries/notifications.ts`.
 *
 * The REST `/notifications` endpoint is the durable, server-scoped feed (newest first). It's an
 * online read — when offline the query simply has no fresh data (notifications are inherently a
 * connectivity feature; there's no offline-persist requirement in Mo7). The realtime hook
 * ({@link file://../hooks/useNotificationsRealtime.ts}) invalidates this key on every live push so
 * the bell badge + panel update within a beat.
 */

export const NOTIFICATIONS_KEY = "notifications";

/** GET /notifications — the caller's own feed. Unread = rows with a null `readAt` (filtered in the UI). */
export function useNotifications() {
  return useQuery<NotificationResponse[]>({
    queryKey: [NOTIFICATIONS_KEY],
    queryFn: () => listNotifications(apiClient),
  });
}

/** POST /notifications/{id}/read — mark one read; refetch the feed so the badge/list update. */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation<NotificationResponse, ApiError, string>({
    mutationFn: (id) => markNotificationRead(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] }),
  });
}
