import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatDate } from "@vet/shared";

import { Pill as PillIcon, Warn } from "@/components/icons";
import { Card, Pill } from "@/components/ui";
import { ScreenShell, TopBar } from "@/components/layout";
import {
  classifyStock,
  daysUntil,
  FIELD_STOCK_SQL,
  type FieldStockRow,
  type StockStatus,
} from "@/sync/fieldInventory";
import { useQuery } from "@/sync/hooks";
import { colors } from "@/theme";

interface Group {
  key: "out" | "low" | "expired" | "expiringSoon";
  title: string;
  tone: "amber" | "red";
  empty: string;
  rows: Array<FieldStockRow & { status: StockStatus }>;
}

/**
 * Mo3.5 — local alerts feed (pre-Mo7 notifications).
 *
 * Groups every stock row that needs the doctor's attention right now:
 *  - out: quantity ≤ 0 (red)
 *  - low: quantity ≤ reorder_point AND reorder_point > 0 (amber)
 *  - expired: expiration_date in the past (red)
 *  - expiringSoon: expiration_date within `system_settings.expiration_warning_days` (amber)
 *
 * Mo7 plumbs the same signals through SignalR + `expo-notifications` so the doctor gets
 * a push when the system notifies them server-side (PRD §9, M11). Until then, this screen
 * is the in-app surface — opened by tapping the alert pills on `/inventory`.
 *
 * Negative-stock attempts (the doctor tried to sell more than on-hand) aren't shown here:
 * the Mo3.3 guard blocks the attempt before it leaves the device, and the rare server-side
 * rejection (race with web-initiated unload) lands in Mo6's conflict-review queue.
 */
export default function AlertsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const { data: rows = [] } = useQuery<FieldStockRow>(FIELD_STOCK_SQL);
  const { data: settingsRows = [] } = useQuery<{ expiration_warning_days: number | null }>(
    `SELECT expiration_warning_days FROM system_settings LIMIT 1`,
  );
  const expirationWarningDays = settingsRows[0]?.expiration_warning_days ?? null;

  const groups = useMemo<Group[]>(() => {
    const classified = rows.map((r) => ({
      ...r,
      status: classifyStock(r, { expirationWarningDays }),
    }));
    const out = classified.filter((r) => r.status === "out");
    const low = classified.filter((r) => r.status === "low");
    const expired = classified.filter((r) => r.status === "expired");
    const expiringSoon = classified.filter((r) => r.status === "expiringSoon");
    return [
      {
        key: "out",
        title: t("inventory.status.out"),
        tone: "red",
        empty: t("inventory.alerts.noLowStock"),
        rows: out,
      },
      {
        key: "low",
        title: t("inventory.alerts.lowStockTitle"),
        tone: "amber",
        empty: t("inventory.alerts.noLowStock"),
        rows: low,
      },
      {
        key: "expired",
        title: t("inventory.status.expired"),
        tone: "red",
        empty: t("inventory.alerts.noExpiring"),
        rows: expired,
      },
      {
        key: "expiringSoon",
        title: t("inventory.alerts.expiringTitle"),
        tone: "amber",
        empty: t("inventory.alerts.noExpiring"),
        rows: expiringSoon,
      },
    ];
  }, [rows, expirationWarningDays, t]);

  const total = groups.reduce((sum, g) => sum + g.rows.length, 0);

  return (
    <ScreenShell
      staticBody
      header={
        <TopBar
          title={t("inventory.alerts.title")}
          onBack={() => router.back()}
          right={null}
        />
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {total === 0 ? (
          <Card flat className="p-4">
            <View className="items-center gap-2">
              <View className="bg-emerald-soft h-12 w-12 items-center justify-center rounded-card">
                <Warn size={20} color={colors.emerald.ink} />
              </View>
              <Text className="text-navy-900 text-center text-[15px] font-tajawal-extrabold">
                {t("mobile.inventory.allClear", { defaultValue: "كل شيء بخير في سيارتك" })}
              </Text>
              <Text className="text-ink-500 text-center text-[12px] font-tajawal">
                {t("mobile.inventory.allClearHint", {
                  defaultValue:
                    "لا توجد أصناف منخفضة أو منتهية. سنخبرك هنا أول ما يتغير شيء.",
                })}
              </Text>
            </View>
          </Card>
        ) : (
          groups.map((group) => (
            <View key={group.key} className="mb-4">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-ink-700 text-[13px] font-tajawal-bold">
                  {group.title}
                </Text>
                <Pill tone={group.tone} label={String(group.rows.length)} />
              </View>
              {group.rows.length === 0 ? (
                <Card flat className="p-3">
                  <Text className="text-ink-500 text-center text-[13px] font-tajawal">
                    {group.empty}
                  </Text>
                </Card>
              ) : (
                <View className="gap-2">
                  {group.rows.map((r) => (
                    <AlertRow
                      key={r.id}
                      row={r}
                      kind={group.key}
                      i18nLang={i18n.resolvedLanguage}
                    />
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </ScreenShell>
  );
}

interface AlertRowProps {
  row: FieldStockRow & { status: StockStatus };
  kind: Group["key"];
  i18nLang: string | undefined;
}

function AlertRow({ row, kind, i18nLang }: AlertRowProps) {
  const { t } = useTranslation();
  const isOut = kind === "out" || kind === "expired";
  const days = daysUntil(row.expiration_date);

  let hint: React.ReactNode = null;
  if (kind === "low" || kind === "out") {
    hint = (
      <Text className="text-ink-500 text-[11px] font-tajawal">
        {row.quantity} / {t("inventory.col.reorderPoint")} {row.reorder_point ?? 0}
      </Text>
    );
  } else if (kind === "expiringSoon" && days !== null) {
    hint = (
      <Text className="text-ink-500 text-[11px] font-tajawal">
        {row.expiration_date ? formatDate(row.expiration_date, i18nLang) + " · " : ""}
        {t("inventory.alerts.daysLeft", { days })}
      </Text>
    );
  } else if (kind === "expired" && days !== null) {
    hint = (
      <Text className="text-rose-ink text-[11px] font-tajawal-bold">
        {row.expiration_date ? formatDate(row.expiration_date, i18nLang) + " · " : ""}
        {t("inventory.alerts.expiredAgo", { days: -days })}
      </Text>
    );
  }

  return (
    <Card className="flex-row items-center gap-3 p-3">
      <View
        className={`h-11 w-11 items-center justify-center rounded-card ${
          isOut ? "bg-rose-soft" : "bg-amber-soft"
        }`}
      >
        <PillIcon size={20} color={isOut ? colors.rose.ink : colors.amber.ink} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
          {row.name_ar ?? row.name_latin ?? "—"}
        </Text>
        {hint}
      </View>
      <Text
        className={`text-[16px] font-tajawal-extrabold ${
          isOut ? "text-rose-ink" : "text-amber-ink"
        }`}
      >
        {Math.round(row.quantity * 1000) / 1000}
      </Text>
    </Card>
  );
}
