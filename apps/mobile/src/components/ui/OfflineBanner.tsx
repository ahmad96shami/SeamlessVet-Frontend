import { Text, View } from "react-native";

import { colors } from "@/theme";

import { WifiOff } from "../icons";

/**
 * `.offline-banner` from styles.css — a yellow info strip that surfaces when the
 * sync engine reports we're offline. Fixed copy via the `message` prop so each
 * caller can localize via i18n.
 */
export function OfflineBanner({ message }: { message: string }) {
  return (
    <View className="bg-amber-soft border-amber-border mx-4 mb-2 flex-row items-center gap-2 rounded-chip border px-3 py-2">
      <WifiOff size={14} color={colors.amber.ink} />
      <Text className="text-amber-ink flex-1 text-[12px] font-tajawal-bold">{message}</Text>
    </View>
  );
}
