import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui";
import { VaccinationForm } from "@/components/forms/VaccinationForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { dialog } from "@/stores/dialogStore";
import { useQuery } from "@/sync/hooks";
import type { PetRow, VaccinationRow, VisitRow } from "@/sync/types";
import { syncDelete, syncUpdate } from "@/sync/writes";

/**
 * Edit a vaccination on a field visit (Mo2.5). Mutable fields: vaccineType, dateGiven,
 * nextDueDate. The recipient (pet vs. farm group) is **locked** — the `/sync/vaccinations`
 * PATCH handler silently ignores `pet_id`, so the old editable selector only ever changed
 * the local row for the server to re-stream the original (fixed in Mo9.2, matching web W13).
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
                  lockRecipient
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
                    void dialog
                      .confirm({
                        title: t("visits.vaccinations.editTitle"),
                        message: t("visits.vaccinations.deleteConfirm"),
                        confirmLabel: t("actions.delete"),
                        destructive: true,
                      })
                      .then(async (ok) => {
                        if (!ok) return;
                        setSubmitting(true);
                        try {
                          await syncDelete("vaccinations", vax.id);
                          router.back();
                        } finally {
                          setSubmitting(false);
                        }
                      });
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
