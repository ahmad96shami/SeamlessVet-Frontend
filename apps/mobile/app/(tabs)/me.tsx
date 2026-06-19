import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Forward, User } from "@/components/icons";
import { ScreenShell, TopBar } from "@/components/layout";
import { NotificationPanel } from "@/components/NotificationPanel";
import { SyncReviewSheet } from "@/components/SyncReviewSheet";
import { Card, Divider, IconTile, Pill, SectionTitle } from "@/components/ui";
import { toggleLanguage } from "@/i18n";
import { useNotifications } from "@/queries/notifications";
import { useAuthStore } from "@/stores/authStore";
import { dialog } from "@/stores/dialogStore";
import { colors } from "@/theme";

/**
 * حسابي (MoD.7) — the fourth tab, finally a real screen. Profile card (fullName
 * from MoD.0 + role + numbering prefix) over a general settings list:
 * notifications (feed panel), language toggle, sync review, and sign-out —
 * which moved here off the home screen. No theme pickers: the design system is
 * locked (navy + teal + Tajawal).
 */
export default function MeScreen() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: notifications } = useNotifications();
  const unread = (notifications ?? []).filter((n) => !n.readAt).length;

  const [panelOpen, setPanelOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const confirmSignOut = () => {
    void dialog
      .confirm({
        title: t("shell.signOut"),
        message: t("me.signOutConfirm"),
        confirmLabel: t("shell.signOut"),
        destructive: true,
      })
      .then((ok) => {
        if (!ok) return;
        void logout().catch((e) => dialog.alert(t("shell.signOut"), (e as Error).message));
      });
  };

  return (
    <ScreenShell
      header={<TopBar title={t("me.title")} right={null} />}
    >
      {/* Profile */}
      <Card className="flex-row items-center gap-3.5 p-4">
        <IconTile size="lg" tone="teal">
          <User size={32} color={colors.teal[700]} />
        </IconTile>
        <View className="min-w-0 flex-1">
          <Text className="text-navy-900 text-[18px] font-tajawal-extrabold" numberOfLines={1}>
            {user?.fullName ?? "—"}
          </Text>
          <Text className="text-ink-500 mt-0.5 text-[13px] font-tajawal">
            {user?.role ? t(`roles.${user.role}`, { defaultValue: user.role }) : ""}
          </Text>
          {user?.centerName ? (
            <Text className="text-teal-700 mt-0.5 text-[13px] font-tajawal-bold" numberOfLines={1}>
              {`${t("shell.center")} · ${user.centerName}`}
            </Text>
          ) : null}
          {user?.numberPrefix ? (
            <View className="mt-1.5 flex-row">
              <Pill tone="teal" compact label={`${t("me.prefix")} · ${user.numberPrefix}`} />
            </View>
          ) : null}
        </View>
      </Card>

      {/* General settings */}
      <SectionTitle title={t("me.general")} />
      <Card className="p-1.5">
        <MenuRow
          title={t("notifications.title")}
          sub={t("notifications.unread", { count: unread })}
          onPress={() => setPanelOpen(true)}
        />
        <Divider />
        <MenuRow
          title={t("shell.language")}
          sub={i18n.resolvedLanguage === "ar" ? "العربية" : "English"}
          onPress={toggleLanguage}
        />
        <Divider />
        <MenuRow
          title={t("me.syncRow")}
          sub={t("me.syncSub")}
          onPress={() => setReviewOpen(true)}
        />
        <Divider />
        <MenuRow title={t("shell.signOut")} destructive onPress={confirmSignOut} />
      </Card>

      <NotificationPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
      <SyncReviewSheet open={reviewOpen} onClose={() => setReviewOpen(false)} />
    </ScreenShell>
  );
}

function MenuRow({
  title,
  sub,
  destructive,
  onPress,
}: {
  title: string;
  sub?: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center p-3 active:opacity-80"
    >
      <View className="min-w-0 flex-1">
        <Text
          className={`text-[14px] font-tajawal-bold ${destructive ? "text-rose-ink" : "text-navy-900"}`}
        >
          {title}
        </Text>
        {sub ? <Text className="text-ink-500 mt-0.5 text-[12px] font-tajawal">{sub}</Text> : null}
      </View>
      {!destructive ? <Forward size={18} color={colors.ink[300]} /> : null}
    </Pressable>
  );
}
