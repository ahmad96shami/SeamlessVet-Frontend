import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui";
import { PrescriptionForm } from "@/components/forms/PrescriptionForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { PrescriptionRow } from "@/sync/types";
import { syncDelete, syncUpdate } from "@/sync/writes";

/**
 * Edit a prescription on a field visit (Mo2.4). The advisory text (dosage / frequency /
 * duration / notes) **and** the M18 recurring-dose reminder schedule (Mo9.5) are mutable —
 * product / quantity / dispense type are immutable post-create (the server's
 * `PrescriptionsSyncHandler.PatchAsync` enforces this, and they carry the Mo4 billing
 * meaning). The form's `lockClinical` flag reflects that.
 */
export default function EditPrescriptionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: visitId, rxId } = useLocalSearchParams<{ id: string; rxId: string }>();
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery<PrescriptionRow>(
    `SELECT * FROM prescriptions WHERE id = ?`,
    [rxId ?? ""],
  );
  const rx = data?.[0];

  return (
    <ScreenShell
      header={
        <TopBar
          title={t("visits.prescriptions.editTitle")}
          onBack={() => router.back()}
          right={null}
        />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-4 pb-8">
            {!rx ? (
              <Text className="text-ink-500 mt-12 text-center text-[14px] font-tajawal">
                {t("visits.detail.notFound")}
              </Text>
            ) : (
              <>
                <PrescriptionForm
                  visitId={visitId ?? rx.visit_id}
                  lockClinical
                  defaultValues={{
                    productId: rx.product_id,
                    dispenseType:
                      (rx.dispense_type as "administered_in_clinic" | "dispensed_to_owner")
                      ?? "dispensed_to_owner",
                    quantity: rx.quantity ?? undefined,
                    dosage: rx.dosage ?? "",
                    frequency: rx.frequency ?? "",
                    duration: rx.duration ?? "",
                    notes: rx.notes ?? "",
                    reminderEnabled: rx.reminder_enabled === 1,
                    intervalMinutes: rx.interval_minutes,
                    leadMinutes: rx.lead_minutes,
                    startAt: rx.start_at,
                    endAt: rx.end_at,
                    dosesCount: rx.doses_count,
                  }}
                  submitLabel={t("actions.save")}
                  submitting={submitting}
                  onSubmit={async (values) => {
                    setSubmitting(true);
                    try {
                      // PATCH path — advisory text + the reminder schedule; product/qty/
                      // dispense_type stay as-is (SQLite has no bool: 0/1 ints).
                      await syncUpdate("prescriptions", rx.id, {
                        dosage: values.dosage ?? null,
                        frequency: values.frequency ?? null,
                        duration: values.duration ?? null,
                        notes: values.notes ?? null,
                        reminder_enabled: values.reminderEnabled ? 1 : 0,
                        interval_minutes: values.intervalMinutes ?? null,
                        lead_minutes: values.leadMinutes ?? null,
                        start_at: values.startAt ?? null,
                        end_at: values.endAt ?? null,
                        doses_count: values.dosesCount ?? null,
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
                      t("visits.prescriptions.editTitle"),
                      t("visits.prescriptions.deleteConfirm"),
                      [
                        { text: t("actions.cancel"), style: "cancel" },
                        {
                          text: t("actions.delete"),
                          style: "destructive",
                          onPress: async () => {
                            setSubmitting(true);
                            try {
                              await syncDelete("prescriptions", rx.id);
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
