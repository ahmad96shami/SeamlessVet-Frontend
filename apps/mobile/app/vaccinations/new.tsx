import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Forward, Search } from "@/components/icons";
import { Card, Input, SkeletonList } from "@/components/ui";
import { useScreenSettled } from "@/hooks/useScreenSettled";
import { VaccinationForm, type VaccineProductOption } from "@/components/forms/VaccinationForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { FIELD_VACCINE_SQL, type FieldVaccineRow } from "@/sync/fieldInventory";
import { useQuery } from "@/sync/hooks";
import type { CustomerRow, PetRow } from "@/sync/types";
import { administerVaccination } from "@/sync/vaccinations";
import { colors } from "@/theme";

/**
 * Create a **standalone** vaccination (Mo9.2; Mo11 vaccines-as-products) — no visit. The recipient
 * is a customer picked here (or fixed via the route param when launched from a customer screen),
 * then a specific pet OR the whole group (farm-group = `customer_id` only, `pet_id` null — SCHEMA).
 * The vaccine is picked from the doctor's field stock; saving administers it (deducts a dose FEFO
 * from the car via `administerVaccination`) and the `/sync/vaccinations` row carries `visit_id` null.
 */
export default function NewStandaloneVaccinationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ customerId?: string }>();
  const [picked, setPicked] = useState<string | null>(params.customerId ?? null);
  const [submitting, setSubmitting] = useState(false);

  const { data: chosenRows } = useQuery<CustomerRow>(
    `SELECT * FROM customers WHERE id = ?`,
    [picked ?? ""],
  );
  const chosen = chosenRows?.[0];

  const { data: pets } = useQuery<PetRow>(
    `SELECT * FROM pets WHERE customer_id = ? ORDER BY name`,
    [picked ?? ""],
  );

  const { data: vaccineRows = [] } = useQuery<FieldVaccineRow>(FIELD_VACCINE_SQL);
  const vaccineProducts = useMemo<VaccineProductOption[]>(
    () =>
      vaccineRows.map((r) => ({
        id: r.id,
        name: r.name_ar ?? r.name_latin ?? "—",
        price: r.selling_price,
        onHand: r.on_hand,
        fieldLocationId: r.field_location_id,
      })),
    [vaccineRows],
  );

  const locked = params.customerId != null;

  if (!picked) {
    return <CustomerPicker onPick={setPicked} />;
  }

  return (
    <ScreenShell
      header={<TopBar title={t("vaccinations.newTitle")} onBack={() => router.back()} right={null} />}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-4 pb-8">
            <Card className="flex-row items-center justify-between gap-3 p-3">
              <View className="flex-1">
                <Text className="text-ink-500 text-[12px] font-tajawal">
                  {t("vaccinations.form.recipient")}
                </Text>
                <Text
                  className="text-navy-900 mt-0.5 text-[15px] font-tajawal-extrabold"
                  numberOfLines={1}
                >
                  {chosen?.full_name ?? "—"}
                </Text>
              </View>
              {!locked ? (
                <Pressable onPress={() => setPicked(null)} accessibilityRole="button">
                  <Text className="text-teal-700 text-[13px] font-tajawal-bold">
                    {t("vaccinations.form.change")}
                  </Text>
                </Pressable>
              ) : null}
            </Card>

            <VaccinationForm
              customerId={picked}
              pets={(pets ?? []).map((p) => ({ id: p.id, name: p.name }))}
              vaccineProducts={vaccineProducts}
              submitLabel={t("actions.save")}
              submitting={submitting}
              onSubmit={async (values) => {
                const product = vaccineProducts.find((p) => p.id === values.productId);
                setSubmitting(true);
                try {
                  await administerVaccination({
                    visitId: null,
                    customerId: values.customerId ?? null,
                    petId: values.petId ?? null,
                    productId: values.productId ?? null,
                    vaccineType: values.vaccineType,
                    price: values.price ?? null,
                    fieldLocationId: product?.fieldLocationId ?? null,
                    dateGiven: values.dateGiven,
                    nextDueDate: values.nextDueDate ?? null,
                    certificateUrl: null,
                  });
                  router.back();
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

/** Pick the customer this vaccination is for — searches the doctor's local customers. */
function CustomerPicker({ onPick }: { onPick: (id: string) => void }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  // Cheap first frame: skeleton through the push transition, rows right after.
  const settled = useScreenSettled();

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
      header={
        <TopBar
          title={t("vaccinations.form.selectCustomer")}
          onBack={() => router.back()}
          right={null}
        />
      }
    >
      <Input
        placeholder={t("vaccinations.form.searchCustomer")}
        value={search}
        onChangeText={setSearch}
        leading={<Search size={18} color={colors.ink[400]} />}
        autoCapitalize="none"
      />
      <FlashList
        // Style object, not className — FlashList isn't css-interop registered.
        style={{ marginTop: 12, flex: 1 }}
        data={settled ? filtered.slice(0, 80) : []}
        keyExtractor={(c) => c.id}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          !settled ? (
            <SkeletonList />
          ) : (
            <View className="mt-12 items-center">
              <Text className="text-ink-500 text-[14px] font-tajawal">{t("customers.empty")}</Text>
            </View>
          )
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
              <Forward size={20} color={colors.ink[400]} />
            </Card>
          </Pressable>
        )}
      />
    </ScreenShell>
  );
}
