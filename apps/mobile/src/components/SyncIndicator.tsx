import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { deriveStatus, totalConflicts, totalPending, useSyncStore } from "@/stores/syncStore";

import { Check, Spinner, Warn, WifiOff } from "./icons";

/**
 * Compact, live sync pill — replaces the home header's hardcoded chip. Drives a single derived
 * state machine off the {@link useSyncStore} so the indicator, the offline banner, and the review
 * sheet agree on what to show. The count it badges is the **combined** unsynced total across the
 * REST-intent queue and PowerSync's own CRUD queue ({@link totalPending}).
 *
 * Pressable: tapping opens the Mo6.2 conflict-review sheet (passed as `onPress`) so the doctor can
 * see exactly what's pending or parked — nothing syncs or fails silently.
 *
 * Tones map to the design tokens:
 *   offline  → grey + WifiOff icon
 *   syncing  → teal + spinner-shaped icon (no rotation; the indicator is only a hint)
 *   conflict → amber + Warn icon
 *   online   → teal-soft + check icon
 */
export function SyncIndicator({ onPress }: { onPress?: () => void }) {
  const { t } = useTranslation();
  const snapshot = useSyncStore();
  const status = deriveStatus(snapshot);
  const pending = totalPending(snapshot);

  const body = (() => {
    if (status === "online" && pending === 0) {
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
            {t("sync.syncing", { count: pending })}
          </Text>
        </View>
      );
    }

    if (status === "conflict") {
      return (
        <View className="bg-amber-soft flex-row items-center gap-1.5 rounded-pill px-2.5 py-1">
          <Warn size={12} color="#8A6A00" />
          <Text className="text-amber-ink text-[12px] font-tajawal-bold">
            {t("sync.conflict", { count: totalConflicts(snapshot) })}
          </Text>
        </View>
      );
    }

    // offline (including the "online but pending" case before the engine flushes)
    return (
      <View className="bg-ink-100 flex-row items-center gap-1.5 rounded-pill px-2.5 py-1">
        <WifiOff size={12} color="#3A4A66" />
        <Text className="text-ink-700 text-[12px] font-tajawal-bold">
          {t("sync.offline", { count: pending })}
        </Text>
      </View>
    );
  })();

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  );
}
