import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui";
import { VaccinationForm } from "@/components/forms/VaccinationForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { PetRow, VaccinationRow, VisitRow } from "@/sync/types";
import { syncDelete, syncUpdate } from "@/sync/writes";

/**
 * Edit a vaccination on a field visit (Mo2.5). All four mutable fields (pet, vaccineType,
 * dateGiven, nextDueDate) round-trip through the form; the recipient (pet vs. farm group)
 * stays editable because the SCHEMA constraint is "either petId or customerId" — both
 * choices remain valid as long as customerId stays set, which the form always keeps.
 */
export default function EditVaccinationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: visitId, vaxId } = useLocalSearchParams<{ id: string; vaxId: string }>();
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery<VaccinationRow>(
    `SELECT * FROM vaccinations WHERE id = ?`,
    [vaxId ?? ""],
  );
  const vax = data?.[0];

  const { data: visits } = useQuery<VisitRow>(
    `SELECT * FROM visits WHERE id = ?`,
    [visitId ?? ""],
  );
  const visit = visits?.[0];

  const { data: pets } = useQuery<PetRow>(
    `SELECT * FROM pets WHERE customer_id = ? ORDER BY name`,
    [visit?.customer_id ?? vax?.customer_id ?? ""],
  );

  return (
    <ScreenShell
      header={
        <TopBar
          title={t("visits.vaccinations.editTitle")}
          onBack={() => router.back()}
          right={null}
        />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-4 pb-8">
            {!vax ? (
              <Text className="text-ink-500 mt-12 text-center text-[14px] font-tajawal">
                {t("visits.detail.notFound")}
              </Text>
            ) : (
              <>
                <VaccinationForm
                  customerId={vax.customer_id ?? visit?.customer_id ?? ""}
                  visitId={vax.visit_id ?? visitId}
                  pets={(pets ?? []).map((p) => ({ id: p.id, name: p.name }))}
                  defaultValues={{
                    petId: vax.pet_id,
                    vaccineType: vax.vaccine_type,
                    dateGiven: vax.date_given,
                    nextDueDate: vax.next_due_date ?? "",
                  }}
                  submitLabel={t("actions.save")}
                  submitting={submitting}
                  onSubmit={async (values) => {
                    setSubmitting(true);
                    try {
                      await syncUpdate("vaccinations", vax.id, {
                        pet_id: values.petId ?? null,
                        vaccine_type: values.vaccineType,
                        date_given: values.dateGiven,
                        next_due_date: values.nextDueDate ?? null,
                      });
                      router.back();
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                />
                <Button
                  label={t("actions.delete")}
                  variant="soft"
                  onPress={() => {
                    Alert.alert(
                      t("visits.vaccinations.editTitle"),
                      t("visits.vaccinations.deleteConfirm"),
                      [
                        { text: t("actions.cancel"), style: "cancel" },
                        {
                          text: t("actions.delete"),
                          style: "destructive",
                          onPress: async () => {
                            setSubmitting(true);
                            try {
                              await syncDelete("vaccinations", vax.id);
                              router.back();
                            } finally {
                              setSubmitting(false);
                            }
                          },
                        },
                      ],
                    );
                  }}
                  block
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
