import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatDate } from "@vet/shared";

import { Add, Forward, Paper, Search } from "@/components/icons";
import { Chip, IconTile, Input, ListRow, Money, Pill, SkeletonList } from "@/components/ui";
import { NavBottomBar, ScreenShell, TopBar } from "@/components/layout";
import { useScreenSettled } from "@/hooks/useScreenSettled";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@/sync/hooks";
import type { ContractRow } from "@/sync/types";
import { colors } from "@/theme";

type StatusFilter = "all" | "draft" | "active" | "completed" | "cancelled";
const STATUS_FILTERS: ReadonlyArray<StatusFilter> = [
  "all",
  "draft",
  "active",
  "completed",
  "cancelled",
];

const STATUS_TONE: Record<string, "teal" | "amber" | "green" | "red" | "neutral"> = {
  draft: "amber",
  active: "green",
  completed: "neutral",
  cancelled: "red",
};

interface RowWithCustomer extends ContractRow {
  customer_name: string | null;
}

/**
 * The doctor's contracts list (Mo5.1). Reads `contracts` joined to `customers` from on-device
 * SQLite, scoped to the contracts this doctor is responsible for (`responsible_doctor_id` — the
 * same scope PowerSync streams). Fully offline; tap a row for the detail/draft editor, or "+ New"
 * to author a draft. Reached from the home screen (contracts aren't one of the four bottom tabs).
 */
export default function ContractsListScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const userId = useAuthStore((s) => s.user?.userId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const { data, isLoading } = useQuery<RowWithCustomer>(
    `SELECT c.*, cu.full_name AS customer_name
       FROM contracts c
       LEFT JOIN customers cu ON cu.id = c.customer_id
       WHERE c.responsible_doctor_id = ?
       ORDER BY COALESCE(c.updated_at, c.created_at, c.period_start) DESC`,
    [userId ?? ""],
  );

  // Cheap first frame: skeleton through the push transition, rows right after.
  const settled = useScreenSettled();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!q) return true;
      return (
        (c.customer_name ?? "").toLowerCase().includes(q)
        || (c.animal_type ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, status]);

  return (
    <ScreenShell
      staticBody
      header={<TopBar title={t("nav.contracts")} right={null} />}
      footer={<NavBottomBar active="home" />}
    >
      <View className="gap-3">
        <Input
          placeholder={t("customers.searchPlaceholder")}
          value={search}
          onChangeText={setSearch}
          leading={<Search size={18} color={colors.ink[400]} />}
          autoCapitalize="none"
        />

        {/* One row, never wraps — full-bleed horizontal scroll (RTL starts right). */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-5 grow-0"
          contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
        >
          {STATUS_FILTERS.map((s) => (
            <Chip
              key={s}
              label={s === "all" ? t("finance.all") : t(`contractStatus.${s}`)}
              active={status === s ? "navy" : "off"}
              onPress={() => setStatus(s)}
            />
          ))}
        </ScrollView>

        <View className="mt-1 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.push("/contracts/new")}
            className="bg-navy-900 active:bg-navy-800 flex-row items-center gap-1.5 rounded-pill px-4 py-2"
          >
            <Add size={14} color={colors.white} />
            <Text className="text-paper text-[12px] font-tajawal-bold">
              {t("finance.contracts.new")}
            </Text>
          </Pressable>
          <Text className="text-ink-700 text-[13px] font-tajawal-bold">
            {filtered.length} / {(data ?? []).length}
          </Text>
        </View>
      </View>

      <FlashList
        // Full-bleed: ScrollViews clip children on Android, so the horizontal
        // body padding lives INSIDE the scroll content or card shadows get cut.
        // Style object, not className — FlashList isn't css-interop registered.
        style={{ marginHorizontal: -20, marginTop: 12, flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
        data={settled ? filtered : []}
        keyExtractor={(c) => c.id}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          isLoading || !settled ? (
            <SkeletonList />
          ) : (
            <View className="mt-12 items-center">
              <Text className="text-ink-500 text-[14px] font-tajawal">
                {t("finance.contracts.empty")}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ListRow
            onPress={() => router.push({ pathname: "/contracts/[id]", params: { id: item.id } })}
          >
            <IconTile>
              <Paper size={20} color={colors.teal[600]} />
            </IconTile>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-navy-900 text-[15px] font-tajawal-extrabold" numberOfLines={1}>
                {item.customer_name ?? "—"}
              </Text>
              <View className="flex-row flex-wrap items-center gap-1.5">
                <Pill
                  compact
                  tone={STATUS_TONE[item.status] ?? "neutral"}
                  label={t(`contractStatus.${item.status}`)}
                />
                {item.period_start ? (
                  <Pill
                    compact
                    tone="neutral"
                    label={formatDate(item.period_start, i18n.resolvedLanguage)}
                  />
                ) : null}
                {item.total_price != null ? (
                  <Money value={item.total_price} className="text-[13px]" />
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
