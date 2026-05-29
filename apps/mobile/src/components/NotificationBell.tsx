import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Bell } from "@/components/icons";
import { NotificationPanel } from "@/components/NotificationPanel";
import { useNotifications } from "@/queries/notifications";

/**
 * Mo7.3 — the home-header notification bell. Badges the unread count (feed rows with a null
 * `readAt`) and opens the feed panel. Replaces the design's static placeholder dot; the live
 * feed query is invalidated by the realtime hook so the badge tracks pushes within a beat.
 */
export function NotificationBell() {
  const { t } = useTranslation();
  const { data } = useNotifications();
  const [open, setOpen] = useState(false);
  const unread = (data ?? []).filter((n) => !n.readAt).length;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("notifications.title")}
        className="border-ink-100 bg-paper relative h-10 w-10 items-center justify-center rounded-chip border"
      >
        <Bell size={18} color="#223D69" />
        {unread > 0 ? (
          <View
            className="bg-amber h-[18px] min-w-[18px] items-center justify-center rounded-pill px-1"
            style={{ position: "absolute", top: -3, right: -3 }}
          >
            <Text className="text-navy-900 text-[10px] font-tajawal-bold">
              {unread > 99 ? "99+" : unread}
            </Text>
          </View>
        ) : null}
      </Pressable>
      <NotificationPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
