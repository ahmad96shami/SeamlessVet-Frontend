import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, Text, View } from "react-native";

import { Add, Bird, Briefcase, Cow, Forward, House, Search } from "@/components/icons";
import { Chip, Input, ListRow, Photo, photoKindForCustomerType, Pill } from "@/components/ui";
import { NavBottomBar, ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { CustomerRow } from "@/sync/types";
import { colors } from "@/theme";

type TypeFilter = "all" | "regular_farm" | "home" | "cattle_farm" | "poultry_farm";

const TYPE_FILTERS: Array<{ key: TypeFilter; icon?: React.ReactNode }> = [
  { key: "all" },
  { key: "poultry_farm", icon: <Bird size={14} color={colors.ink[900]} /> },
  { key: "cattle_farm", icon: <Cow size={14} color={colors.ink[900]} /> },
  { key: "regular_farm", icon: <Briefcase size={14} color={colors.ink[900]} /> },
  { key: "home", icon: <House size={14} color={colors.ink[900]} /> },
];

const TYPE_ICON: Record<string, React.ReactNode> = {
  poultry_farm: <Bird size={12} color={colors.ink[900]} />,
  cattle_farm: <Cow size={12} color={colors.ink[900]} />,
  regular_farm: <Briefcase size={12} color={colors.ink[900]} />,
  home: <House size={12} color={colors.ink[900]} />,
};

interface CustomerWithPetCount extends CustomerRow {
  pet_count: number;
}

export default function CustomersListScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("all");

  // PowerSync's `useQuery` re-emits on any underlying-table change, so a synced row
  // (or a freshly inserted local one) shows up without manual cache invalidation.
  // The LEFT JOIN brings the per-customer pet count for the row subtitle.
  const { data, isLoading } = useQuery<CustomerWithPetCount>(
    `SELECT c.*, (SELECT COUNT(*) FROM pets p WHERE p.customer_id = c.id) AS pet_count
     FROM customers c
     ORDER BY c.updated_at DESC`,
  );

  // Search is applied in JS so the watched-query stays stable (the input value isn't a SQL
  // parameter and re-binding it triggers a recompile). Volume per doctor is small (the
  // sync rules already scope to assigned customers); a linear filter is fine here.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((c) => {
      if (type !== "all" && c.type !== type) return false;
      if (!q) return true;
      return (
        c.full_name.toLowerCase().includes(q)
        || (c.phone_primary ?? "").toLowerCase().includes(q)
        || (c.id_number ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, type]);

  return (
    <ScreenShell
      staticBody
      header={<TopBar title={t("customers.title")} right={null} />}
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
          {TYPE_FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.key === "all" ? t("common.all", { defaultValue: "الكل" }) : t(`customerType.${f.key}`)}
              leadingIcon={f.icon}
              active={type === f.key ? "navy" : "off"}
              onPress={() => setType(f.key)}
            />
          ))}
        </View>

        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-ink-700 text-[13px] font-tajawal-bold">
            {filtered.length} / {(data ?? []).length}
          </Text>
          <Pressable
            onPress={() => router.push("/customers/new")}
            className="bg-navy-900 active:bg-navy-800 flex-row items-center gap-1.5 rounded-pill px-3 py-1.5"
          >
            <Add size={14} color={colors.white} />
            <Text className="text-paper text-[12px] font-tajawal-bold">{t("customers.new")}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        // Full-bleed: ScrollViews clip children on Android, so the horizontal
        // body padding lives INSIDE the scroll content or card shadows get cut.
        className="-mx-5 mt-3 flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
        data={filtered}
        keyExtractor={(c) => c.id}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          <View className="mt-12 items-center">
            <Text className="text-ink-500 text-[14px] font-tajawal">
              {isLoading ? t("actions.loading") : t("customers.empty")}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <CustomerRow
            customer={item}
            onPress={() => router.push(`/customers/${item.id}`)}
          />
        )}
      />
    </ScreenShell>
  );
}

interface CustomerRowProps {
  customer: CustomerWithPetCount;
  onPress: () => void;
}

function CustomerRow({ customer, onPress }: CustomerRowProps) {
  const { t } = useTranslation();
  return (
    <ListRow onPress={onPress}>
      <Photo kind={photoKindForCustomerType(customer.type)} size={56} />
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-navy-900 text-[15px] font-tajawal-extrabold" numberOfLines={1}>
          {customer.full_name}
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          <Pill
            compact
            tone="neutral"
            label={t(`customerType.${customer.type}`)}
            leadingIcon={TYPE_ICON[customer.type]}
          />
          {customer.pet_count > 0 ? (
            <Pill compact tone="teal" label={`${customer.pet_count} ${t("customers.pets.title")}`} />
          ) : null}
          {customer.phone_primary ? (
            <Pill compact tone="neutral" label={customer.phone_primary} />
          ) : null}
        </View>
      </View>
      <Forward size={20} color={colors.ink[400]} />
    </ListRow>
  );
}
