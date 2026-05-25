import { useState } from "react";
import { useTranslation } from "react-i18next";

import { NotificationPanel } from "@/components/layout/NotificationPanel";
import { Icon } from "@/components/ui/icon";
import { useNotifications } from "@/queries/notifications";

/**
 * The shell's notification bell: an unread badge over the bell icon, opening the feed panel.
 * The feed is kept live by {@link useNotificationsRealtime} (each SignalR push invalidates it),
 * so the badge updates within seconds of a server event.
 */
export function NotificationBell() {
  const { t } = useTranslation();
  const { data } = useNotifications();
  const [open, setOpen] = useState(false);

  const unread = (data ?? []).filter((n) => !n.readAt).length;
  const title = t("notifications.title");

  return (
    <>
      <button className="icon-pill" title={title} aria-label={title} onClick={() => setOpen(true)}>
        <Icon.bell size={16} />
        {unread > 0 ? <span className="badge neutral">{unread}</span> : null}
      </button>
      <NotificationPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
