import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui";
import { VaccinationForm } from "@/components/forms/VaccinationForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { dialog } from "@/stores/dialogStore";
import { useQuery } from "@/sync/hooks";
import type { PetRow, VaccinationRow } from "@/sync/types";
import { syncDelete, syncUpdate } from "@/sync/writes";

/**
 * Edit a vaccination from the agenda (Mo9.2) — works for standalone *and* visit-logged rows.
 * The recipient is **locked**: `/sync/vaccinations` PATCH ignores `pet_id`/`customer_id`
 * (immutable post-create, like web W13). Mutable: vaccineType, dateGiven, nextDueDate.
 */
export default function EditAgendaVaccinationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { vaxId } = useLocalSearchParams<{ vaxId: string }>();
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery<VaccinationRow>(
    `SELECT * FROM vaccinations WHERE id = ?`,
    [vaxId ?? ""],
  );
  const vax = data?.[0];

  // Pet-scoped rows may carry no customer_id — resolve the owner through the pet so the
  // locked-recipient line can name the pet.
  const { data: pets } = useQuery<PetRow>(
    `SELECT * FROM pets WHERE customer_id = COALESCE(?, (SELECT customer_id FROM pets WHERE id = ?)) ORDER BY name`,
    [vax?.customer_id ?? null, vax?.pet_id ?? ""],
  );

  return (
    <ScreenShell
      header={
        <TopBar title={t("vaccinations.editTitle")} onBack={() => router.back()} right={null} />
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
                  customerId={vax.customer_id ?? ""}
                  visitId={vax.visit_id ?? undefined}
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
                        title: t("vaccinations.deleteTitle"),
                        message: t("vaccinations.deleteConfirm"),
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
