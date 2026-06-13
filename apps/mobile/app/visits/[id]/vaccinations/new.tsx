import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { VaccinationForm, type VaccineProductOption } from "@/components/forms/VaccinationForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { FIELD_VACCINE_SQL, type FieldVaccineRow } from "@/sync/fieldInventory";
import { useQuery } from "@/sync/hooks";
import type { PetRow, VisitRow } from "@/sync/types";
import { administerVaccination } from "@/sync/vaccinations";

/**
 * Create a vaccination on a field visit (Mo2.5; Mo11 vaccines-as-products). Defaults the form's pet
 * to the visit's pet (when one is set); the doctor can clear it to log a farm-group vaccination.
 * The vaccine is picked from the doctor's field stock; saving administers it — `administerVaccination`
 * writes the `/sync/vaccinations` row plus a `sale_deduct` field-stock movement in one transaction.
 */
export default function NewVaccinationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: visitId } = useLocalSearchParams<{ id: string }>();
  const [submitting, setSubmitting] = useState(false);

  const { data: visits } = useQuery<VisitRow>(
    `SELECT * FROM visits WHERE id = ?`,
    [visitId ?? ""],
  );
  const visit = visits?.[0];

  const { data: pets } = useQuery<PetRow>(
    `SELECT * FROM pets WHERE customer_id = ? ORDER BY name`,
    [visit?.customer_id ?? ""],
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

  if (!visit) {
    return (
      <ScreenShell
        header={
          <TopBar
            title={t("visits.vaccinations.newTitle")}
            onBack={() => router.back()}
            right={null}
          />
        }
      >
        <View className="items-center pt-12">
          <Text className="text-ink-500 text-[14px] font-tajawal">
            {t("visits.detail.notFound")}
          </Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      header={
        <TopBar
          title={t("visits.vaccinations.newTitle")}
          onBack={() => router.back()}
          right={null}
        />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="pb-8">
            <VaccinationForm
              customerId={visit.customer_id}
              visitId={visit.id}
              pets={(pets ?? []).map((p) => ({ id: p.id, name: p.name }))}
              vaccineProducts={vaccineProducts}
              defaultValues={{ petId: visit.pet_id ?? undefined }}
              submitLabel={t("actions.save")}
              submitting={submitting}
              onSubmit={async (values) => {
                const product = vaccineProducts.find((p) => p.id === values.productId);
                setSubmitting(true);
                try {
                  await administerVaccination({
                    visitId: values.visitId ?? null,
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
