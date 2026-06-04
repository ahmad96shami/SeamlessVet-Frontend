import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatDate } from "@vet/shared";

import { ArrowDown, ArrowUp, Pill as PillIcon, Truck, Warn } from "@/components/icons";
import { Card, Chip, Pill } from "@/components/ui";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import { colors } from "@/theme";

type FilterKey = "all" | "load_to_field" | "sale_deduct" | "return_add" | "unload_from_field";

interface MovementRow {
  id: string;
  product_id: string;
  movement_type: string;
  from_location_type: string | null;
  from_location_id: string | null;
  to_location_type: string | null;
  to_location_id: string | null;
  quantity_delta: number;
  reason: string | null;
  visit_id: string | null;
  invoice_id: string | null;
  created_at: string;
  product_name: string | null;
  unit_of_measure: string | null;
}

/**
 * Mo3.4 — the timeline of inventory movements that affect this doctor's "car".
 *
 * Reads `inventory_movements` rows where either `from` or `to` is field-typed (PowerSync's
 * `by_field_inventory` stream covers both directions). The same view surfaces:
 *  - **Web-initiated loads/unloads** that arrived via sync (PRD §6.4 — admin loads stock
 *    into the doctor's car from the central warehouse; web W2's LoadFieldDialog writes
 *    the matching `load_to_field` movement, and the device picks it up automatically).
 *  - **Local writes** the doctor just submitted (Mo3.2 returns, future Mo4 sale_deducts) —
 *    they're optimistic in the local SQLite before PowerSync uploads them.
 *
 * Chips filter by movement type. The 🔴/🟢 tint matches the direction relative to the car:
 * green when stock flows *in* (load, return), red when it flows *out* (sale, unload).
 */
export default function MovementsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<FilterKey>("all");

  const { data: rows = [], isLoading } = useQuery<MovementRow>(
    `SELECT m.id, m.product_id, m.movement_type,
            m.from_location_type, m.from_location_id, m.to_location_type, m.to_location_id,
            m.quantity_delta, m.reason, m.visit_id, m.invoice_id, m.created_at,
            p.name_ar         AS product_name,
            p.unit_of_measure AS unit_of_measure
       FROM inventory_movements m
       LEFT JOIN products p ON p.id = m.product_id
       WHERE m.from_location_type = 'field' OR m.to_location_type = 'field'
       ORDER BY m.created_at DESC
       LIMIT 400`,
  );

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.movement_type === filter);
  }, [rows, filter]);

  return (
    <ScreenShell
      staticBody
      header={
        <TopBar
          title={t("inventory.movements.title")}
          onBack={() => router.back()}
          right={null}
        />
      }
    >
      {/* One row, never wraps — full-bleed horizontal scroll (RTL starts right). */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-5 mb-3 grow-0"
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
      >
        <Chip
          label={t("common.all", { defaultValue: "الكل" }) + ` (${rows.length})`}
          active={filter === "all" ? "navy" : "off"}
          onPress={() => setFilter("all")}
        />
        <Chip
          label={t("inventory.movementType.load_to_field")}
          active={filter === "load_to_field" ? "navy" : "off"}
          onPress={() => setFilter("load_to_field")}
        />
        <Chip
          label={t("inventory.movementType.sale_deduct")}
          active={filter === "sale_deduct" ? "navy" : "off"}
          onPress={() => setFilter("sale_deduct")}
        />
        <Chip
          label={t("inventory.movementType.return_add")}
          active={filter === "return_add" ? "navy" : "off"}
          onPress={() => setFilter("return_add")}
        />
        <Chip
          label={t("inventory.movementType.unload_from_field")}
          active={filter === "unload_from_field" ? "navy" : "off"}
          onPress={() => setFilter("unload_from_field")}
        />
      </ScrollView>

      <FlatList
        // Full-bleed: see the FlatList note in visits/index — shadows clip otherwise.
        className="-mx-5 flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
        data={filtered}
        keyExtractor={(r) => r.id}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          <View className="mt-12 items-center">
            <Text className="text-ink-500 text-[14px] font-tajawal">
              {isLoading ? t("actions.loading") : t("inventory.movements.empty")}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              item.visit_id
                ? router.push({
                    pathname: "/visits/[id]",
                    params: { id: item.visit_id },
                  })
                : undefined
            }
            disabled={!item.visit_id}
          >
            <MovementRowView row={item} i18nLang={i18n.resolvedLanguage} />
          </Pressable>
        )}
      />
    </ScreenShell>
  );
}

interface MovementRowViewProps {
  row: MovementRow;
  i18nLang: string | undefined;
}

function MovementRowView({ row, i18nLang }: MovementRowViewProps) {
  const { t } = useTranslation();
  const direction = movementDirection(row);

  // The doctor's car sees a *delta* — net positive for inflows (load/return), net negative
  // for outflows (sale/unload). `quantity_delta` itself is unsigned for non-adjust types,
  // so we sign it for display based on the direction relative to field stock.
  const signedDelta = direction === "in" ? row.quantity_delta : -row.quantity_delta;
  const tintBg = direction === "in" ? "bg-emerald-soft" : "bg-rose-soft";
  const tintFg = direction === "in" ? colors.emerald.ink : colors.rose.ink;

  return (
    <Card className="flex-row items-center gap-3 p-3">
      <View className={`h-11 w-11 items-center justify-center rounded-card ${tintBg}`}>
        {direction === "in" ? (
          row.movement_type === "load_to_field" ? (
            <Truck size={20} color={tintFg} />
          ) : (
            <ArrowDown size={20} color={tintFg} />
          )
        ) : row.movement_type === "unload_from_field" ? (
          <Truck size={20} color={tintFg} />
        ) : row.movement_type === "sale_deduct" ? (
          <ArrowUp size={20} color={tintFg} />
        ) : (
          <PillIcon size={20} color={tintFg} />
        )}
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
          {row.product_name ?? "—"}
        </Text>
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Pill
            tone={direction === "in" ? "green" : "red"}
            label={t(`inventory.movementType.${row.movement_type}`, {
              defaultValue: row.movement_type,
            })}
          />
          {row.reason ? <Pill tone="neutral" label={row.reason} /> : null}
        </View>
        <Text className="text-ink-500 text-[11px] font-tajawal">
          {formatDate(row.created_at, i18nLang)}
          {row.visit_id ? ` · ${t("visits.title")}` : ""}
        </Text>
      </View>
      <View className="items-end">
        <Text
          className={`text-[16px] font-tajawal-extrabold ${
            direction === "in" ? "text-emerald-ink" : "text-rose-ink"
          }`}
        >
          {signedDelta > 0 ? "+" : ""}
          {Math.round(signedDelta * 1000) / 1000}
        </Text>
        {row.unit_of_measure ? (
          <Text className="text-ink-500 text-[11px] font-tajawal">{row.unit_of_measure}</Text>
        ) : null}
        {row.movement_type === "load_to_field" || row.movement_type === "unload_from_field" ? (
          <View className="mt-0.5 flex-row items-center gap-1">
            <Warn size={11} color={colors.ink[400]} />
            <Text className="text-ink-400 text-[10px] font-tajawal">
              {t("inventory.location.warehouse")}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function movementDirection(row: MovementRow): "in" | "out" {
  // For adjust movements the sign rides on `quantity_delta`. For everything else, the type
  // dictates direction relative to the car (per SCHEMA + InventoryMovementsSyncHandler).
  if (row.movement_type === "adjust") {
    return row.quantity_delta >= 0 ? "in" : "out";
  }
  // Field-side inflows: stock arriving at the doctor's car.
  if (row.to_location_type === "field") return "in";
  // Field-side outflows: stock leaving the doctor's car (sale, unload).
  return "out";
}
