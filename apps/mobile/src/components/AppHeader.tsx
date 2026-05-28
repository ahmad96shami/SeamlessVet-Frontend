import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toggleLanguage } from "@/i18n";

/**
 * Top bar above the app shell: brand + language toggle.
 * RTL-safe — uses NativeWind logical utilities only (the lint rule guards this).
 */
export function AppHeader() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const next = i18n.resolvedLanguage === "ar" ? "EN" : "ع";
  return (
    <View
      style={{ paddingTop: insets.top + 8 }}
      className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 pb-3"
    >
      <Text className="text-base font-semibold text-slate-900">{t("appName")}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={toggleLanguage}
        className="rounded-md border border-slate-300 px-2 py-1 active:bg-slate-100"
      >
        <Text className="text-sm font-medium text-slate-700">{next}</Text>
      </Pressable>
    </View>
  );
}
