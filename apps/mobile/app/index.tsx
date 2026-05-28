import { v7 as uuidv7 } from "uuid";
import { Alert, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@vet/shared";

import { Bell, WifiOff } from "@/components/icons";
import { BottomBar, ScreenShell } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { toggleLanguage } from "@/i18n";
import { useAuthStore } from "@/stores/authStore";

export default function Index() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  // Smoke proof for Mo0.1 — uuid v7 mint only succeeds if the
  // react-native-get-random-values polyfill loaded first. Kept visible (in a
  // monospace card) so the device check stays trivially observable until a real
  // home dashboard lands with Mo2+.
  const id = uuidv7();

  return (
    <ScreenShell
      header={<HomeHeader langLabel={i18n.resolvedLanguage === "ar" ? "EN" : "ع"} />}
      footer={<BottomBar active="home" />}
    >
      <Card className="px-4 py-5">
        <Text className="text-ink-500 text-[12px] font-tajawal">{t("appName")}</Text>
        <Text className="text-navy-900 mt-1 text-[22px] font-tajawal-extrabold">
          Mo0 scaffold — uuid v7 mint OK
        </Text>
        <Text
          className="text-ink-500 mt-3 text-[12px]"
          style={{ fontFamily: "Courier" }}
          selectable
        >
          {id}
        </Text>
        <View className="bg-ink-100 my-4 h-px" />
        <View className="gap-1">
          <Text className="text-ink-700 text-[13px] font-tajawal">
            lng: <Text className="font-tajawal-bold">{i18n.resolvedLanguage}</Text>
            {" · "}
            role: <Text className="font-tajawal-bold">{user?.role ?? "—"}</Text>
          </Text>
          <Text className="text-ink-700 text-[13px] font-tajawal">
            Intl ar-PS:{" "}
            <Text className="text-navy-900 font-tajawal-extrabold">{formatCurrency(1234.5, "ar")}</Text>
          </Text>
        </View>
      </Card>

      <View className="mt-6">
        <Button
          label={t("actions.close")}
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
        <View className="bg-teal-50 flex-row items-center gap-1.5 rounded-pill px-2.5 py-1">
          <WifiOff size={12} color="#0B6573" />
          <Text className="text-teal-700 text-[12px] font-tajawal-bold">دون اتصال</Text>
        </View>
        <View className="border-ink-100 bg-paper relative h-10 w-10 items-center justify-center rounded-chip border">
          <Bell size={18} color="#223D69" />
          <View className="bg-amber absolute right-1.5 top-1.5 h-2 w-2 rounded-pill" />
        </View>
      </View>
    </View>
  );
}
