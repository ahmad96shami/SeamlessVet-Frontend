import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { NotificationResponse } from "@vet/shared";

import { presentLocalNotification } from "@/services/localNotifications";
import { onNotification, startNotificationsHub, stopNotificationsHub } from "@/services/notificationsHub";
import { NOTIFICATIONS_KEY } from "@/queries/notifications";
import { useAuthStore } from "@/stores/authStore";
import { useSyncStore } from "@/stores/syncStore";

/**
 * Mo7.2 — binds the SignalR hub to the React tree (mirrors web W10's `useNotificationsRealtime`).
 * On each live push it (1) invalidates the feed query so the bell badge + panel refresh, and
 * (2) raises a heads-up local notification — the mobile equivalent of web's toast — carrying the
 * notification's `type` + `payload` as deeplink `data` (consumed in Mo7.4).
 *
 * Connection lifecycle is tied to auth: connect on sign-in, stop on logout. Because SignalR's
 * auto-reconnect only engages after a *successful* start, we also re-attempt the initial connect
 * whenever connectivity returns (the doctor is offline-first and may sign in with no signal).
 *
 * Must be mounted inside the React-Query provider (it calls `useQueryClient`) — see AppServices.
 */
export function useNotificationsRealtime(): void {
  const status = useAuthStore((s) => s.status);
  const online = useSyncStore((s) => s.online);
  const qc = useQueryClient();
  const { t } = useTranslation();

  // Keep the latest push handler in a ref so the hub subscription is set up once per auth session
  // and never torn down on a render (e.g. a language toggle changing `t`).
  const handlerRef = useRef<(n: NotificationResponse) => void>(() => {});
  useEffect(() => {
    handlerRef.current = (n) => {
      void qc.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      const heading =
        n.title ?? t(`notifications.type.${n.type}`, { defaultValue: t("notifications.title") });
      void presentLocalNotification({
        title: heading,
        body: n.body,
        data: { notificationId: n.id, type: n.type, payload: n.payload ?? null },
      });
    };
  }, [qc, t]);

  // Subscribe + manage the connection for the authenticated session.
  useEffect(() => {
    if (status !== "authenticated") {
      void stopNotificationsHub();
      return;
    }
    const off = onNotification((n) => handlerRef.current(n));
    void startNotificationsHub();
    return () => {
      off();
      void stopNotificationsHub();
    };
  }, [status]);

  // Retry the initial connect when connectivity returns.
  useEffect(() => {
    if (status === "authenticated" && online) void startNotificationsHub();
  }, [status, online]);
}
