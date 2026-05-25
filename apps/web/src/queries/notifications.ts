import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications,
  markNotificationRead,
  type ApiError,
  type NotificationResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "notifications";

/** The bell's feed — newest 50, self-scoped. Live pushes invalidate this (see useNotificationsRealtime). */
export function useNotifications() {
  return useQuery<NotificationResponse[], ApiError>({
    queryKey: [KEY],
    queryFn: () => listNotifications(apiClient, { take: 50 }),
  });
}

/** POST /notifications/{id}/read — mark one read; refetch the feed so the badge/list update. */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation<NotificationResponse, ApiError, string>({
    mutationFn: (id) => markNotificationRead(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
