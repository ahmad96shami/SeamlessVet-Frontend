import { useMemo, useState } from "react";
import { Pressable, SectionList, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatDate } from "@vet/shared";

import { Add, Forward, Search, Syringe } from "@/components/icons";
import { IconTile, Input, ListRow, Pill } from "@/components/ui";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { VaccinationRow } from "@/sync/types";
import { colors } from "@/theme";

interface RowWithNames extends VaccinationRow {
  customer_name: string | null;
  pet_name: string | null;
}

interface DueSection {
  title: string;
  overdue: boolean;
  data: RowWithNames[];
}

/**
 * Upcoming-vaccination agenda (Mo9.2) — **offline, from on-device SQLite**, per the plan
 * ("an upcoming calendar (offline from SQLite)"). The doctor's synced scope (their assigned
 * customers' vaccinations, streamed `by_customer`/`by_visit`) is exactly the schedule they
 * work; the auth-only `GET /vaccinations/upcoming` stays a web/clinic concern (W13).
 *
 * Shape follows W13's date-only insight — a vaccination has a due *date*, not a time — so
 * this is an agenda grouped by `next_due_date`, soonest first, not an hour-grid or month
 * widget (no calendar component exists on mobile and none is worth a dep here). Overdue
 * dates (before today) sort naturally to the top and are flagged red.
 */
export default function VaccinationsAgendaScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Pet-scoped rows may carry no customer_id — resolve the owner through the pet for display.
  const { data, isLoading } = useQuery<RowWithNames>(
    `SELECT vx.*, pe.name AS pet_name, c.full_name AS customer_name
       FROM vaccinations vx
       LEFT JOIN pets pe ON pe.id = vx.pet_id
       LEFT JOIN customers c ON c.id = COALESCE(vx.customer_id, pe.customer_id)
      WHERE vx.next_due_date IS NOT NULL
      ORDER BY vx.next_due_date ASC, vx.id
      LIMIT 500`,
  );

  const sections = useMemo<DueSection[]>(() => {
    const q = search.trim().toLowerCase();
    const rows = (data ?? []).filter((v) => {
      if (!q) return true;
      return (
        v.vaccine_type.toLowerCase().includes(q)
        || (v.customer_name ?? "").toLowerCase().includes(q)
        || (v.pet_name ?? "").toLowerCase().includes(q)
      );
    });

    const byDate = new Map<string, RowWithNames[]>();
    for (const row of rows) {
      const key = row.next_due_date ?? "";
      const bucket = byDate.get(key);
      if (bucket) bucket.push(row);
      else byDate.set(key, [row]);
    }
    return [...byDate.entries()].map(([date, items]) => ({
      title: date,
      overdue: date < today,
      data: items,
    }));
  }, [data, search, today]);

  return (
    <ScreenShell
      staticBody
      header={<TopBar title={t("vaccinations.title")} onBack={() => router.back()} right={null} />}
    >
      <View className="gap-3">
        <Input
          placeholder={t("vaccinations.form.searchCustomer")}
          value={search}
          onChangeText={setSearch}
          leading={<Search size={18} color={colors.ink[400]} />}
          autoCapitalize="none"
        />

        <View className="mt-1 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.push("/vaccinations/new")}
            className="bg-navy-900 active:bg-navy-800 flex-row items-center gap-1.5 rounded-pill px-3 py-1.5"
          >
            <Add size={14} color={colors.white} />
            <Text className="text-paper text-[12px] font-tajawal-bold">{t("vaccinations.new")}</Text>
          </Pressable>
          <Text className="text-ink-700 text-[13px] font-tajawal-bold">
            {(data ?? []).length > 0 ? `${sections.reduce((n, s) => n + s.data.length, 0)} / ${(data ?? []).length}` : ""}
          </Text>
        </View>
      </View>

      <SectionList
        // Full-bleed: see the FlatList note in visits/index — shadows clip otherwise.
        className="-mx-5 mt-3 flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
        sections={sections}
        keyExtractor={(v) => v.id}
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View className="h-2" />}
        SectionSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          <View className="mt-12 items-center">
            <Text className="text-ink-500 text-[14px] font-tajawal">
              {isLoading ? t("actions.loading") : t("vaccinations.calendar.empty")}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View className="flex-row items-center gap-2 pb-1 pt-2">
            <Text
              className={`text-[13px] font-tajawal-extrabold ${section.overdue ? "text-rose-ink" : "text-ink-700"}`}
            >
              {formatDate(section.title, i18n.resolvedLanguage)}
            </Text>
            {section.overdue ? <Pill compact tone="red" label={t("vaccinations.calendar.due")} /> : null}
          </View>
        )}
        renderItem={({ item }) => (
          <ListRow
            onPress={() =>
              router.push({ pathname: "/vaccinations/[vaxId]/edit", params: { vaxId: item.id } })
            }
          >
            <IconTile>
              <Syringe size={20} color={colors.teal[600]} />
            </IconTile>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-navy-900 text-[15px] font-tajawal-extrabold" numberOfLines={1}>
                {item.vaccine_type}
              </Text>
              <Text className="text-ink-500 text-[12px] font-tajawal" numberOfLines={1}>
                {item.customer_name ?? t("vaccinations.recipientUnknown")}
                {" · "}
                {item.pet_name ?? t("vaccinations.recipientFarm")}
              </Text>
            </View>
            <Forward size={20} color={colors.ink[400]} />
          </ListRow>
        )}
      />
    </ScreenShell>
  );
}
