import { useTranslation } from "react-i18next";
import { formatDateTime, type NotificationResponse } from "@vet/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useMarkNotificationRead, useNotifications } from "@/queries/notifications";

/** A read row is muted; an unread row gets a teal accent dot + a bolder title. */
function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: NotificationResponse;
  onMarkRead: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const unread = !notification.readAt;
  const typeLabel = t(`notifications.type.${notification.type}`, { defaultValue: notification.type });

  return (
    <li className={cn("rounded-xl border border-border p-3", unread ? "bg-card" : "bg-card/40")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {unread ? <span className="size-2 shrink-0 rounded-full bg-teal-500" aria-hidden /> : null}
            <Badge variant={unread ? "default" : "secondary"}>{typeLabel}</Badge>
          </div>
          {notification.title ? (
            <p className={cn("text-sm text-navy-900", unread && "font-semibold")}>{notification.title}</p>
          ) : null}
          {notification.body ? (
            <p className="text-xs text-muted-foreground">{notification.body}</p>
          ) : null}
          <p className="text-xs text-muted-foreground" dir="ltr">
            {formatDateTime(notification.createdAt, lang)}
          </p>
        </div>
        {unread ? (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => onMarkRead(notification.id)}
          >
            {t("notifications.markRead")}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/** The bell's feed (M11): newest-first notifications with per-row + bulk mark-read. */
export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  const items = data ?? [];
  const unread = items.filter((n) => !n.readAt);

  const markAllRead = () => {
    for (const n of unread) markRead.mutate(n.id);
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("notifications.title")}>
      <div className="space-y-3">
        {unread.length > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {t("notifications.unread", { count: unread.length })}
            </span>
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              {t("notifications.markAllRead")}
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("actions.loading")}</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("notifications.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <NotificationItem key={n.id} notification={n} onMarkRead={(id) => markRead.mutate(id)} />
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
