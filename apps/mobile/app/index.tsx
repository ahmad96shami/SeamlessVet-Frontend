import { v7 as uuidv7 } from "uuid";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/Button";
import { useAuthStore } from "@/stores/authStore";

export default function Index() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [signingOut, setSigningOut] = useState(false);
  // Smoke proof for Mo0 task 1: a uuid v7 mint only succeeds if the
  // `react-native-get-random-values` polyfill loaded first (Hermes has no
  // built-in crypto.getRandomValues, which uuid v7 requires).
  const id = uuidv7();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-slate-900">{t("appName")}</Text>
      <Text className="mt-2 text-sm text-slate-600">Mo0 scaffold — uuid v7 mint OK</Text>
      <Text className="mt-2 text-xs font-mono text-slate-500" selectable>
        {id}
      </Text>
      <Text className="mt-4 text-xs text-slate-400">
        i18n: {i18n.resolvedLanguage} · role: {user?.role ?? "—"}
      </Text>
      <View className="mt-8 w-full max-w-xs">
        <Button
          label={t("actions.close")}
          variant="ghost"
          loading={signingOut}
          onPress={async () => {
            setSigningOut(true);
            try {
              await logout();
            } catch (e) {
              Alert.alert("Logout", (e as Error).message);
            } finally {
              setSigningOut(false);
            }
          }}
        />
      </View>
    </View>
  );
}
