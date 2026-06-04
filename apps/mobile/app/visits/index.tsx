import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatDate } from "@vet/shared";

import { Add, Forward } from "@/components/icons";
import { Chip, Input, ListRow, Photo, photoKindForCustomerType, Pill } from "@/components/ui";
import { Search } from "@/components/icons";
import { NavBottomBar, ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { VisitRow } from "@/sync/types";
import { colors } from "@/theme";

type StatusFilter = "all" | "open" | "in_progress" | "completed" | "cancelled";
const STATUS_FILTERS: ReadonlyArray<StatusFilter> = ["all", "open", "in_progress", "completed", "cancelled"];

const STATUS_TONE: Record<string, "teal" | "amber" | "green" | "red" | "neutral"> = {
  open: "teal",
  in_progress: "amber",
  completed: "green",
  cancelled: "red",
};

interface RowWithCustomer extends VisitRow {
  customer_name: string | null;
  customer_type: string | null;
  pet_name: string | null;
}

/**
 * Local visits list (Mo2.6). Reads `visits` joined to `customers` and `pets` from on-device
 * SQLite so the doctor can scan their day's work — and any prior visits PowerSync streamed
 * down within the ~6-month window — entirely offline. Tap a row to open the detail screen
 * (Mo2.2). The "+ New visit" CTA bounces through `/customers` so the doctor picks the
 * customer first (visits always require a customer + auto-link to active contract + batch).
 */
export default function VisitsListScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const { data, isLoading } = useQuery<RowWithCustomer>(
    `SELECT v.*, c.full_name AS customer_name, c.type AS customer_type, pe.name AS pet_name
       FROM visits v
       LEFT JOIN customers c ON c.id = v.customer_id
       LEFT JOIN pets pe ON pe.id = v.pet_id
       ORDER BY COALESCE(v.started_at, v.created_at) DESC`,
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((v) => {
      if (status !== "all" && v.status !== status) return false;
      if (!q) return true;
      return (
        (v.visit_number ?? "").toLowerCase().includes(q)
        || (v.customer_name ?? "").toLowerCase().includes(q)
        || (v.pet_name ?? "").toLowerCase().includes(q)
        || (v.chief_complaint ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, status]);

  return (
    <ScreenShell
      staticBody
      header={<TopBar title={t("nav.visits")} right={null} />}
      footer={<NavBottomBar active="visits" />}
    >
      <View className="gap-3">
        <Input
          placeholder={t("customers.searchPlaceholder")}
          value={search}
          onChangeText={setSearch}
          leading={<Search size={18} color={colors.ink[400]} />}
          autoCapitalize="none"
        />

        <View className="flex-row flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <Chip
              key={s}
              label={s === "all" ? t("common.all", { defaultValue: "الكل" }) : t(`visitStatus.${s}`)}
              active={status === s ? "navy" : "off"}
              onPress={() => setStatus(s)}
            />
          ))}
        </View>

        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-ink-700 text-[13px] font-tajawal-bold">
            {filtered.length} / {(data ?? []).length}
          </Text>
          <Pressable
            onPress={() => router.push("/visits/new")}
            className="bg-navy-900 active:bg-navy-800 flex-row items-center gap-1.5 rounded-pill px-3 py-1.5"
          >
            <Add size={14} color={colors.white} />
            <Text className="text-paper text-[12px] font-tajawal-bold">{t("visits.new")}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        className="mt-3 flex-1"
        data={filtered}
        keyExtractor={(v) => v.id}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          <View className="mt-12 items-center">
            <Text className="text-ink-500 text-[14px] font-tajawal">
              {isLoading ? t("actions.loading") : t("visits.empty", { defaultValue: "لا توجد زيارات" })}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ListRow
            onPress={() => router.push({ pathname: "/visits/[id]", params: { id: item.id } })}
          >
            <Photo kind={photoKindForCustomerType(item.customer_type)} size={56} />
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-navy-900 text-[15px] font-tajawal-extrabold" numberOfLines={1}>
                {item.customer_name ?? "—"}
              </Text>
              {item.chief_complaint || item.pet_name ? (
                <Text className="text-ink-500 text-[13px] font-tajawal" numberOfLines={1}>
                  {[item.pet_name, item.chief_complaint].filter(Boolean).join(" · ")}
                </Text>
              ) : null}
              <View className="flex-row flex-wrap gap-1.5">
                <Pill
                  compact
                  tone={STATUS_TONE[item.status] ?? "neutral"}
                  label={t(`visitStatus.${item.status}`)}
                />
                {item.visit_number ? <Pill compact tone="neutral" label={item.visit_number} /> : null}
                {item.started_at ? (
                  <Pill
                    compact
                    tone="neutral"
                    label={formatDate(item.started_at, i18n.resolvedLanguage)}
                  />
                ) : null}
              </View>
            </View>
            <Forward size={20} color={colors.ink[400]} />
          </ListRow>
        )}
      />
    </ScreenShell>
  );
}
