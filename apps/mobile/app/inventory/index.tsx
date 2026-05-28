import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatDate } from "@vet/shared";

import { ArrowDown, Pill as PillIcon, Search, Truck, Warn } from "@/components/icons";
import { NavBottomBar, ScreenShell, TopBar } from "@/components/layout";
import { Card, Chip, Input, Pill } from "@/components/ui";
import {
  classifyStock,
  FIELD_STOCK_SQL,
  LAST_LOADED_AT_SQL,
  type FieldStockRow,
  type StockStatus,
  totalUnits,
} from "@/sync/fieldInventory";
import { useQuery } from "@/sync/hooks";

type Tab = "all" | "low" | "expiring";

const STATUS_TONE: Record<StockStatus, "neutral" | "teal" | "amber" | "green" | "red"> = {
  ok: "green",
  low: "amber",
  out: "red",
  expiringSoon: "amber",
  expired: "red",
};

/**
 * Mo3.1 — the field doctor's on-device inventory list ("the car").
 *
 * Reads `stock_items` joined to `products` straight from PowerSync's on-device SQLite
 * (sync-rules `by_field_inventory` stream + `reference` stream for the catalog). The
 * sync rules already scope rows to this doctor's `field_inventories`, so we don't filter
 * by `location_id` here — `location_type = 'field'` is the only guard needed.
 *
 * Header card: total units, items count, last load timestamp + low/expiry alert pills.
 * Tabs filter the body to `all` / `low` / `expiring`. Movements live behind their own
 * route (Mo3.4 — reflected from web load/unload). Tap "تسجيل إرجاع" to open the
 * medication-return flow (Mo3.2).
 */
export default function InventoryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const { data: rows = [], isLoading } = useQuery<FieldStockRow>(FIELD_STOCK_SQL);
  const { data: lastLoadedRows = [] } = useQuery<{ last_loaded_at: string | null }>(
    LAST_LOADED_AT_SQL,
  );
  const { data: settingsRows = [] } = useQuery<{ expiration_warning_days: number | null }>(
    `SELECT expiration_warning_days FROM system_settings LIMIT 1`,
  );

  const lastLoadedAt = lastLoadedRows[0]?.last_loaded_at ?? null;
  const expirationWarningDays = settingsRows[0]?.expiration_warning_days ?? null;

  const classified = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        status: classifyStock(r, { expirationWarningDays }),
      })),
    [rows, expirationWarningDays],
  );

  const counts = useMemo(() => {
    let low = 0;
    let expiring = 0;
    for (const r of classified) {
      if (r.status === "low" || r.status === "out") low++;
      if (r.status === "expiringSoon" || r.status === "expired") expiring++;
    }
    return { low, expiring, total: totalUnits(classified) };
  }, [classified]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classified.filter((r) => {
      if (tab === "low" && r.status !== "low" && r.status !== "out") return false;
      if (tab === "expiring" && r.status !== "expiringSoon" && r.status !== "expired") return false;
      if (!q) return true;
      return (
        (r.name_ar ?? "").toLowerCase().includes(q)
        || (r.name_latin ?? "").toLowerCase().includes(q)
      );
    });
  }, [classified, tab, search]);

  return (
    <ScreenShell
      staticBody
      header={<TopBar title={t("nav.inventory")} right={null} />}
      footer={<NavBottomBar active="inv" />}
    >
      <Card className="p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 gap-1">
            <Text className="text-ink-500 text-[12px] font-tajawal">
              {t("mobile.inventory.subtitle", { defaultValue: "مخزون متنقل · سيارتي" })}
            </Text>
            <View className="flex-row items-baseline gap-1.5">
              <Text className="text-navy-900 text-[22px] font-tajawal-extrabold">
                {counts.total}
              </Text>
              <Text className="text-ink-700 text-[13px] font-tajawal-bold">
                {t("mobile.inventory.unit", { defaultValue: "وحدة" })}
              </Text>
            </View>
            <View className="mt-1.5 flex-row flex-wrap gap-1.5">
              {lastLoadedAt ? (
                <Pill
                  tone="teal"
                  leadingIcon={<Truck size={12} color="#0B6573" />}
                  label={t("mobile.inventory.lastLoaded", {
                    defaultValue: "آخر تحميل {{date}}",
                    date: formatDate(lastLoadedAt, i18n.resolvedLanguage),
                  })}
                />
              ) : null}
              {counts.low > 0 ? (
                <Pill
                  tone="amber"
                  leadingIcon={<Warn size={12} color="#7A4F00" />}
                  label={t("inventory.kpi.lowStock") + ` · ${counts.low}`}
                />
              ) : null}
              {counts.expiring > 0 ? (
                <Pill
                  tone="amber"
                  leadingIcon={<Warn size={12} color="#7A4F00" />}
                  label={t("inventory.kpi.expiring") + ` · ${counts.expiring}`}
                />
              ) : null}
            </View>
          </View>
          <View className="bg-teal-50 h-16 w-16 items-center justify-center rounded-card">
            <PillIcon size={28} color="#0F7A8A" />
          </View>
        </View>

        <View className="mt-3 flex-row gap-2">
          <Pressable
            // Cast: expo-router only regenerates its typed-routes manifest when the dev
            // server runs; the route exists physically (app/inventory/returns/new.tsx),
            // so a literal string would resolve at runtime — `as never` placates the
            // stale typegen until the next `expo start`.
            onPress={() => router.push("/inventory/returns/new" as never)}
            className="bg-navy-900 active:bg-navy-800 flex-1 flex-row items-center justify-center gap-1.5 rounded-pill px-3 py-2.5"
            accessibilityRole="button"
          >
            <ArrowDown size={14} color="#FFFFFF" />
            <Text className="text-paper text-[13px] font-tajawal-bold">
              {t("mobile.inventory.recordReturn", { defaultValue: "تسجيل إرجاع" })}
            </Text>
          </Pressable>
          <Pressable
            // Same expo-router typed-routes caveat as above.
            onPress={() => router.push("/inventory/movements" as never)}
            className="bg-paper border-ink-100 flex-1 flex-row items-center justify-center gap-1.5 rounded-pill border px-3 py-2.5"
            accessibilityRole="button"
          >
            <Truck size={14} color="#0B6573" />
            <Text className="text-navy-900 text-[13px] font-tajawal-bold">
              {t("inventory.movements.title", { defaultValue: "سجل الحركات" })}
            </Text>
          </Pressable>
        </View>
      </Card>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <Chip
          label={t("common.all", { defaultValue: "الكل" }) + ` (${classified.length})`}
          active={tab === "all" ? "navy" : "off"}
          onPress={() => setTab("all")}
        />
        <Chip
          label={t("inventory.status.low") + ` (${counts.low})`}
          active={tab === "low" ? "navy" : "off"}
          onPress={() => setTab("low")}
        />
        <Chip
          label={t("inventory.status.expiringSoon") + ` (${counts.expiring})`}
          active={tab === "expiring" ? "navy" : "off"}
          onPress={() => setTab("expiring")}
        />
      </View>

      <View className="mt-3">
        <Input
          placeholder={t("inventory.searchPlaceholder")}
          value={search}
          onChangeText={setSearch}
          leading={<Search size={18} color="#94A1B5" />}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        className="mt-3 flex-1"
        data={filtered}
        keyExtractor={(r) => r.id}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          <View className="mt-12 items-center">
            <Text className="text-ink-500 text-[14px] font-tajawal">
              {isLoading
                ? t("actions.loading")
                : tab === "low"
                  ? t("inventory.alerts.noLowStock")
                  : tab === "expiring"
                    ? t("inventory.alerts.noExpiring")
                    : t("inventory.empty")}
            </Text>
          </View>
        }
        renderItem={({ item }) => <StockRow row={item} i18nLang={i18n.resolvedLanguage} />}
      />
    </ScreenShell>
  );
}

interface StockRowProps {
  row: FieldStockRow & { status: StockStatus };
  i18nLang: string | undefined;
}

function StockRow({ row, i18nLang }: StockRowProps) {
  const { t } = useTranslation();
  const tone = STATUS_TONE[row.status];
  const isOut = row.status === "out";

  return (
    <Card className="flex-row items-center gap-3 p-3">
      <View
        className={`h-12 w-12 items-center justify-center rounded-card ${
          isOut ? "bg-rose-soft" : "bg-teal-50"
        }`}
      >
        <PillIcon size={22} color={isOut ? "#B33235" : "#0F7A8A"} />
      </View>
      <View className="flex-1 gap-1">
        <Text
          className="text-navy-900 text-[15px] font-tajawal-extrabold"
          numberOfLines={1}
        >
          {row.name_ar ?? row.name_latin ?? "—"}
        </Text>
        <View className="flex-row flex-wrap items-center gap-1.5">
          {row.unit_of_measure ? (
            <Pill tone="neutral" label={row.unit_of_measure} />
          ) : null}
          {row.status !== "ok" ? (
            <Pill tone={tone} label={t(`inventory.status.${row.status}`)} />
          ) : null}
          {row.expiration_date ? (
            <Pill
              tone={row.status === "expired" || row.status === "expiringSoon" ? "amber" : "neutral"}
              label={formatDate(row.expiration_date, i18nLang)}
            />
          ) : null}
        </View>
      </View>
      <View className="items-end">
        <Text
          className={`text-[18px] font-tajawal-extrabold ${
            isOut ? "text-rose-ink" : "text-navy-900"
          }`}
        >
          {Math.round(row.quantity * 1000) / 1000}
        </Text>
        {(row.reorder_point ?? 0) > 0 ? (
          <Text className="text-ink-500 text-[11px] font-tajawal">
            {t("inventory.col.reorderPoint")} {row.reorder_point}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
