import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { VaccinationForm } from "@/components/forms/VaccinationForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { PetRow, VisitRow } from "@/sync/types";
import { syncInsert } from "@/sync/writes";

/**
 * Create a vaccination on a field visit (Mo2.5). Defaults the form's pet to the visit's pet
 * (when one is set); the doctor can clear it to log a farm-group vaccination instead. Writes
 * are local-first via `syncInsert("vaccinations", …)` — PowerSync uploads through
 * `PUT /sync/vaccinations` on reconnect.
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
              defaultValues={{ petId: visit.pet_id ?? undefined }}
              submitLabel={t("actions.save")}
              submitting={submitting}
              onSubmit={async (values) => {
                setSubmitting(true);
                try {
                  await syncInsert("vaccinations", {
                    visit_id: values.visitId ?? null,
                    customer_id: values.customerId ?? null,
                    pet_id: values.petId ?? null,
                    vaccine_type: values.vaccineType,
                    date_given: values.dateGiven,
                    next_due_date: values.nextDueDate ?? null,
                    certificate_url: null,
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
