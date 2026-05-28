import { v7 as uuidv7 } from "uuid";
import { Alert, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@vet/shared";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { useAuthStore } from "@/stores/authStore";

export default function Index() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  // Smoke proof for Mo0.1 — uuid v7 mint only succeeds if the
  // react-native-get-random-values polyfill loaded first.
  const id = uuidv7();

  return (
    <View className="flex-1 bg-white">
      <AppHeader />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-bold text-slate-900">{t("appName")}</Text>
        <Text className="mt-2 text-sm text-slate-600">Mo0 scaffold — uuid v7 mint OK</Text>
        <Text className="mt-2 text-xs font-mono text-slate-500" selectable>
          {id}
        </Text>
        <Text className="mt-4 text-xs text-slate-400">
          lng: {i18n.resolvedLanguage} · role: {user?.role ?? "—"}
        </Text>
        {/* Hermes Intl smoke (audit requirement): if this renders correctly,
            cross-locale currency formatting via Intl works on-device. */}
        <Text className="mt-1 text-xs text-slate-400">
          Intl ar-PS: {formatCurrency(1234.5, "ar")}
        </Text>
        <View className="mt-8 w-full max-w-xs">
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
          />
        </View>
      </View>
    </View>
  );
}
