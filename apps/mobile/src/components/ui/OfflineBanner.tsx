import { Text, View } from "react-native";

import { WifiOff } from "../icons";

/**
 * `.offline-banner` from styles.css — a yellow info strip that surfaces when the
 * sync engine reports we're offline. Fixed copy via the `message` prop so each
 * caller can localize via i18n.
 */
export function OfflineBanner({ message }: { message: string }) {
  return (
    <View className="bg-amber-soft mx-4 mb-2 flex-row items-center gap-2 rounded-chip border border-[#F1D989] px-3 py-2">
      <WifiOff size={14} color="#8A6A00" />
      <Text className="text-amber-ink text-[12px] font-tajawal-bold">{message}</Text>
    </View>
  );
}
