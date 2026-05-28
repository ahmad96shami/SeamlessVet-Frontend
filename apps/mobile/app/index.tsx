import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Bell, Briefcase, Stethoscope, User } from "@/components/icons";
import { NavBottomBar, ScreenShell } from "@/components/layout";
import { SyncIndicator } from "@/components/SyncIndicator";
import { Button, Card } from "@/components/ui";
import { toggleLanguage } from "@/i18n";
import { useAuthStore } from "@/stores/authStore";

export default function Index() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <ScreenShell
      header={<HomeHeader langLabel={i18n.resolvedLanguage === "ar" ? "EN" : "ع"} />}
      footer={<NavBottomBar active="home" />}
    >
      <Card className="flex-row items-center gap-3 p-4">
        <View className="bg-teal-50 h-14 w-14 items-center justify-center rounded-card">
          <User size={22} color="#0F7A8A" />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-ink-500 text-[12px] font-tajawal">
            {t("dashboard.greeting.morning")}
          </Text>
          <Text className="text-navy-900 text-[16px] font-tajawal-extrabold" numberOfLines={1}>
            {user?.userId ?? "—"}
          </Text>
          <Text className="text-ink-500 text-[12px] font-tajawal">
            {t("nav.customers")}
            {user?.numberPrefix ? ` · ${user.numberPrefix}` : ""}
          </Text>
        </View>
      </Card>

      <View className="mt-5 flex-row gap-2">
        <QuickAction
          label={t("dashboard.actions.newVisit")}
          icon={<Stethoscope size={20} color="#FFFFFF" />}
          primary
          onPress={() => router.push("/customers")}
        />
        <QuickAction
          label={t("nav.customers")}
          icon={<Briefcase size={20} color="#0F7A8A" />}
          onPress={() => router.push("/customers")}
        />
      </View>

      <View className="mt-6">
        <Button
          label={t("shell.signOut")}
          variant="ghost"
          onPress={async () => {
            try {
              await logout();
            } catch (e) {
              Alert.alert("Logout", (e as Error).message);
            }
          }}
          block
        />
      </View>
    </ScreenShell>
  );
}

interface QuickActionProps {
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
  onPress: () => void;
}

function QuickAction({ label, icon, primary, onPress }: QuickActionProps) {
  return (
    <Pressable onPress={onPress} className="flex-1">
      <Card
        className={`items-center justify-center gap-2 p-4 ${primary ? "bg-navy-900" : ""}`}
        style={primary ? { backgroundColor: "#0B1B36" } : undefined}
      >
        <View
          className={`h-9 w-9 items-center justify-center rounded-chip ${primary ? "" : "bg-teal-50"}`}
          style={primary ? { backgroundColor: "rgba(255,255,255,0.14)" } : undefined}
        >
          {icon}
        </View>
        <Text
          className={`text-center text-[12px] font-tajawal-extrabold ${primary ? "text-paper" : "text-navy-900"}`}
        >
          {label}
        </Text>
      </Card>
    </Pressable>
  );
}

/** Compact home header — a placeholder until Mo2 brings the doctor card + sync state. */
function HomeHeader({ langLabel }: { langLabel: string }) {
  return (
    <View className="bg-paper border-b border-ink-100 flex-row items-center justify-between px-5 py-3">
      <Pressable
        onPress={toggleLanguage}
        accessibilityRole="button"
        className="border-ink-200 rounded-chip border px-2.5 py-1"
      >
        <Text className="text-ink-700 text-[13px] font-tajawal-bold">{langLabel}</Text>
      </Pressable>

      <View className="flex-row items-center gap-2">
        <SyncIndicator />
        <View className="border-ink-100 bg-paper relative h-10 w-10 items-center justify-center rounded-chip border">
          <Bell size={18} color="#223D69" />
          <View className="bg-amber absolute right-1.5 top-1.5 h-2 w-2 rounded-pill" />
        </View>
      </View>
    </View>
  );
}
