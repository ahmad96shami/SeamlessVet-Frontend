import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { onNotification, startNotificationsHub, stopNotificationsHub } from "@/services/notificationsHub";

/**
 * Owns the realtime-notifications lifecycle for the authenticated session: it opens the SignalR
 * hub on mount and closes it on unmount (mounted by the shell, so that's login → logout). Each live
 * push refreshes the bell's feed (so the badge + list update) and raises a toast — the title/body
 * come rendered from the server, with the localized type label as the fallback heading.
 */
export function useNotificationsRealtime(): void {
  const qc = useQueryClient();
  const { t } = useTranslation();

  useEffect(() => {
    void startNotificationsHub();

    const off = onNotification((notification) => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      const heading =
        notification.title ?? t(`notifications.type.${notification.type}`, { defaultValue: t("notifications.title") });
      toast(heading, { description: notification.body ?? undefined });
    });

    return () => {
      off();
      void stopNotificationsHub();
    };
  }, [qc, t]);
}
