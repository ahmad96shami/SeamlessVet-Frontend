import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Forward, Search } from "@/components/icons";
import { Card, Input } from "@/components/ui";
import { ContractForm } from "@/components/forms/ContractForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@/sync/hooks";
import type { CustomerRow } from "@/sync/types";
import { syncInsert } from "@/sync/writes";

/**
 * Author a new **draft** contract offline (Mo5.1). The customer is either passed in via the route
 * query (from the customer detail's "عقد جديد" CTA) or picked here from the doctor's local farms.
 * The new row is born `draft`, `responsible_doctor_id` = the logged-in doctor (so it lands in their
 * own sync scope), and uploads through `PUT /sync/contracts` on reconnect — device-authoritative
 * while draft (the server never overwrites a draft on sync; PRD §8.4).
 */
export default function NewContractScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ customerId?: string }>();
  const userId = useAuthStore((s) => s.user?.userId);
  const [picked, setPicked] = useState<string | null>(params.customerId ?? null);
  const [submitting, setSubmitting] = useState(false);

  // The chosen customer (for the header card). Local-only — these are the doctor's farms.
  const { data: chosenRows } = useQuery<CustomerRow>(
    `SELECT * FROM customers WHERE id = ?`,
    [picked ?? ""],
  );
  const chosen = chosenRows?.[0];

  // When `customerId` came from the route the customer is fixed; the in-screen picker offers a
  // "change" affordance only when the doctor picked it here.
  const locked = params.customerId != null;

  if (!picked) {
    return <CustomerPicker onPick={setPicked} />;
  }

  return (
    <ScreenShell
      header={<TopBar title={t("finance.contracts.newTitle")} onBack={() => router.back()} right={null} />}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-4 pb-8">
            <Card className="flex-row items-center justify-between gap-3 p-3">
              <View className="flex-1">
                <Text className="text-ink-500 text-[12px] font-tajawal">
                  {t("finance.contracts.customer")}
                </Text>
                <Text className="text-navy-900 mt-0.5 text-[15px] font-tajawal-extrabold" numberOfLines={1}>
                  {chosen?.full_name ?? "—"}
                </Text>
              </View>
              {!locked ? (
                <Pressable onPress={() => setPicked(null)} accessibilityRole="button">
                  <Text className="text-teal-700 text-[13px] font-tajawal-bold">{t("actions.edit")}</Text>
                </Pressable>
              ) : null}
            </Card>

            <ContractForm
              customerId={picked}
              submitLabel={t("actions.save")}
              submitting={submitting}
              onSubmit={async (values) => {
                if (!userId) return;
                setSubmitting(true);
                try {
                  const id = await syncInsert("contracts", {
                    customer_id: values.customerId,
                    responsible_doctor_id: userId,
                    created_by: userId,
                    period_start: values.periodStart,
                    period_end: values.periodEnd ?? null,
                    total_price: values.totalPrice ?? null,
                    expected_visit_count: values.expectedVisitCount ?? null,
                    animal_type: values.animalType ?? null,
                    animal_count: values.animalCount ?? null,
                    status: "draft",
                  });
                  router.replace({ pathname: "/contracts/[id]", params: { id } });
                } finally {
                  setSubmitting(false);
                }
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

/** Pick the farm this contract is for — searches the doctor's local customers. */
function CustomerPicker({ onPick }: { onPick: (id: string) => void }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const { data } = useQuery<CustomerRow>(`SELECT * FROM customers ORDER BY full_name LIMIT 400`);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = data ?? [];
    if (!q) return all;
    return all.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q)
        || (c.phone_primary ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <ScreenShell
      staticBody
      header={<TopBar title={t("finance.selectCustomer")} onBack={() => router.back()} right={null} />}
    >
      <Input
        placeholder={t("customers.searchPlaceholder")}
        value={search}
        onChangeText={setSearch}
        leading={<Search size={18} color="#94A1B5" />}
        autoCapitalize="none"
      />
      <FlatList
        className="mt-3 flex-1"
        data={filtered.slice(0, 80)}
        keyExtractor={(c) => c.id}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          <View className="mt-12 items-center">
            <Text className="text-ink-500 text-[14px] font-tajawal">{t("customers.empty")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => onPick(item.id)}>
            <Card className="flex-row items-center gap-3 p-3">
              <View className="flex-1 gap-1">
                <Text className="text-navy-900 text-[15px] font-tajawal-extrabold" numberOfLines={1}>
                  {item.full_name}
                </Text>
                {item.phone_primary ? (
                  <Text className="text-ink-500 text-[12px] font-tajawal">{item.phone_primary}</Text>
                ) : null}
              </View>
              <Forward size={20} color="#94A1B5" />
            </Card>
          </Pressable>
        )}
      />
    </ScreenShell>
  );
}
