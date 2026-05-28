import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useSyncStore, deriveStatus } from "@/stores/syncStore";

import { Check, Spinner, Warn, WifiOff } from "./icons";

/**
 * Compact, live sync pill — replaces the home header's hardcoded "دون اتصال" chip.
 * Drives a single derived state machine off the {@link useSyncStore} so the indicator,
 * the offline banner, and the (Mo6) review panel agree on what to show.
 *
 * Tones map to the design tokens:
 *   offline  → grey + WifiOff icon
 *   syncing  → teal + spinner-shaped icon (no rotation; RN spinners cost a frame budget
 *              and the indicator is only a hint)
 *   conflict → amber + AlertCircle icon
 *   online   → teal-soft + check icon
 */
export function SyncIndicator() {
  const { t } = useTranslation();
  const snapshot = useSyncStore();
  const status = deriveStatus(snapshot);

  if (status === "online" && snapshot.pendingCount === 0) {
    return (
      <View className="bg-teal-50 flex-row items-center gap-1.5 rounded-pill px-2.5 py-1">
        <Check size={12} color="#0B6573" />
        <Text className="text-teal-700 text-[12px] font-tajawal-bold">
          {t("sync.online", { count: 0 })}
        </Text>
      </View>
    );
  }

  if (status === "syncing") {
    return (
      <View className="bg-teal-50 flex-row items-center gap-1.5 rounded-pill px-2.5 py-1">
        <Spinner size={12} color="#0B6573" />
        <Text className="text-teal-700 text-[12px] font-tajawal-bold">
          {t("sync.syncing", { count: snapshot.pendingCount })}
        </Text>
      </View>
    );
  }

  if (status === "conflict") {
    return (
      <View className="bg-amber-soft flex-row items-center gap-1.5 rounded-pill px-2.5 py-1">
        <Warn size={12} color="#8A6A00" />
        <Text className="text-amber-ink text-[12px] font-tajawal-bold">{t("sync.conflict")}</Text>
      </View>
    );
  }

  // offline (including the "online but pending" case before the engine flushes)
  return (
    <View className="bg-ink-100 flex-row items-center gap-1.5 rounded-pill px-2.5 py-1">
      <WifiOff size={12} color="#3A4A66" />
      <Text className="text-ink-700 text-[12px] font-tajawal-bold">
        {t("sync.offline", { count: snapshot.pendingCount })}
      </Text>
    </View>
  );
}
