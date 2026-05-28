import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, Text, View } from "react-native";

import { Add, Bird, Briefcase, Cow, Forward, House, Search } from "@/components/icons";
import { Card, Chip, Input, Pill } from "@/components/ui";
import { NavBottomBar, ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { CustomerRow } from "@/sync/types";

type TypeFilter = "all" | "regular_farm" | "home" | "cattle_farm" | "poultry_farm";

const TYPE_FILTERS: Array<{ key: TypeFilter; icon?: React.ReactNode }> = [
  { key: "all" },
  { key: "poultry_farm", icon: <Bird size={14} color="#0E1B2C" /> },
  { key: "cattle_farm", icon: <Cow size={14} color="#0E1B2C" /> },
  { key: "regular_farm", icon: <Briefcase size={14} color="#0E1B2C" /> },
  { key: "home", icon: <House size={14} color="#0E1B2C" /> },
];

const TYPE_ICON: Record<string, React.ReactNode> = {
  poultry_farm: <Bird size={12} color="#0E1B2C" />,
  cattle_farm: <Cow size={12} color="#0E1B2C" />,
  regular_farm: <Briefcase size={12} color="#0E1B2C" />,
  home: <House size={12} color="#0E1B2C" />,
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
          leading={<Search size={18} color="#94A1B5" />}
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
            <Add size={14} color="#FFFFFF" />
            <Text className="text-paper text-[12px] font-tajawal-bold">{t("customers.new")}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        className="mt-3 flex-1"
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
    <Pressable onPress={onPress}>
      <Card className="flex-row items-center gap-3 p-3">
        <View className="bg-teal-50 h-12 w-12 items-center justify-center rounded-card">
          {TYPE_ICON[customer.type] ?? <House size={20} color="#0F7A8A" />}
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-navy-900 text-[15px] font-tajawal-extrabold" numberOfLines={1}>
            {customer.full_name}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            <Pill tone="neutral" label={t(`customerType.${customer.type}`)} leadingIcon={TYPE_ICON[customer.type]} />
            {customer.pet_count > 0 ? (
              <Pill tone="teal" label={`${customer.pet_count} ${t("customers.pets.title")}`} />
            ) : null}
            {customer.phone_primary ? (
              <Pill tone="neutral" label={customer.phone_primary} />
            ) : null}
          </View>
        </View>
        <Forward size={20} color="#94A1B5" />
      </Card>
    </Pressable>
  );
}
