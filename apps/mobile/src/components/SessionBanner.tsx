import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Shield } from "@/components/icons";
import { useAuthStore } from "@/stores/authStore";
import { colors } from "@/theme";

/**
 * App-wide read-only banner (PRD §8.8). **Self-gating**: it renders only when the session is
 * `sessionExpired` *and still authenticated* — i.e. the access token lapsed and we couldn't refresh
 * (offline), but the session isn't gone. Reads from local SQLite keep working and writes keep
 * queuing; a reconnect + refresh (or re-login) clears it. Hosted by {@link ScreenShell} so every
 * screen shows it without per-screen wiring.
 */
export function SessionBanner() {
  const { t } = useTranslation();
  const expired = useAuthStore((s) => s.sessionExpired);
  const status = useAuthStore((s) => s.status);
  if (!expired || status !== "authenticated") return null;
  return (
    <View className="bg-amber-soft border-amber-border flex-row items-center gap-2 border-b px-4 py-2">
      <Shield size={14} color={colors.amber.ink} />
      <Text className="text-amber-ink flex-1 text-[12px] font-tajawal-bold">
        {t("auth.session.expiredBanner")}
      </Text>
    </View>
  );
}
