import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatDate, type NotificationResponse } from "@vet/shared";

import { Button, Card, Pill } from "@/components/ui";
import { useMarkNotificationRead, useNotifications } from "@/queries/notifications";

/**
 * Mo7.3 — the notifications feed panel (a bottom sheet, mirroring SyncReviewSheet). Lists the
 * caller's feed newest-first with per-row + bulk mark-read; the unread summary uses the shared
 * Arabic CLDR plural forms (`notifications.unread_{zero,one,two,few,many,other}`). There is no
 * mark-all-read endpoint server-side, so "mark all" iterates the unread rows (same as web W10).
 *
 * Opening a row marks it read; Mo7.4 layers deeplink navigation onto the same tap.
 */
export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  const items = data ?? [];
  const unread = items.filter((n) => !n.readAt);

  const openItem = (n: NotificationResponse) => {
    if (!n.readAt) markRead.mutate(n.id);
    // Mo7.4 adds deeplink navigation + onClose() here.
  };
  const markAllRead = () => {
    for (const n of unread) markRead.mutate(n.id);
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-[rgba(8,16,30,0.45)]" onPress={onClose}>
        <Pressable className="bg-paper rounded-t-card max-h-[80%] px-5 pb-8 pt-4" onPress={() => {}}>
          <View className="flex-row items-center justify-between pb-1">
            <Text className="text-navy-900 text-[17px] font-tajawal-extrabold">
              {t("notifications.title")}
            </Text>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
              <Text className="text-teal-700 text-[14px] font-tajawal-bold">{t("actions.close")}</Text>
            </Pressable>
          </View>

          {unread.length > 0 ? (
            <View className="flex-row items-center justify-between gap-2 pb-1">
              <Text className="text-ink-500 text-[12px] font-tajawal">
                {t("notifications.unread", { count: unread.length })}
              </Text>
              <Button
                label={t("notifications.markAllRead")}
                variant="ghost"
                size="sm"
                disabled={markRead.isPending}
                onPress={markAllRead}
              />
            </View>
          ) : null}

          {isLoading ? (
            <Text className="text-ink-500 py-8 text-center text-[13px] font-tajawal">
              {t("actions.loading")}
            </Text>
          ) : items.length === 0 ? (
            <Text className="text-ink-500 py-8 text-center text-[13px] font-tajawal">
              {t("notifications.empty")}
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} className="grow-0">
              <View className="gap-2 pt-2">
                {items.map((n) => (
                  <NotificationItem key={n.id} n={n} onOpen={openItem} />
                ))}
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function NotificationItem({
  n,
  onOpen,
}: {
  n: NotificationResponse;
  onOpen: (n: NotificationResponse) => void;
}) {
  const { t, i18n } = useTranslation();
  const typeLabel = t(`notifications.type.${n.type}`, { defaultValue: n.type });
  const heading = n.title ?? typeLabel;
  const unread = !n.readAt;
  return (
    <Pressable onPress={() => onOpen(n)} accessibilityRole="button">
      <Card flat className={`gap-1.5 p-3 ${unread ? "" : "opacity-60"}`}>
        <View className="flex-row items-start gap-2">
          {unread ? (
            <View className="bg-teal-600 mt-1.5 h-2 w-2 rounded-pill" />
          ) : (
            <View className="w-2" />
          )}
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-navy-900 text-[14px] font-tajawal-bold" numberOfLines={1}>
              {heading}
            </Text>
            {n.body ? (
              <Text className="text-ink-500 text-[12px] font-tajawal" numberOfLines={3}>
                {n.body}
              </Text>
            ) : null}
            <View className="flex-row flex-wrap items-center gap-2 pt-0.5">
              <Pill tone="neutral" label={typeLabel} />
              <Text className="text-ink-400 text-[11px] font-tajawal">
                {formatDate(n.createdAt, i18n.resolvedLanguage)}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
