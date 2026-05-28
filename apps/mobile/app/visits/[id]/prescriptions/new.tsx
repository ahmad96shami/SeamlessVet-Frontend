import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { PrescriptionForm } from "@/components/forms/PrescriptionForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { syncInsert } from "@/sync/writes";

/**
 * Create a prescription on a field visit (Mo2.4). The row is appended to local SQLite and
 * PowerSync uploads it via `PUT /sync/prescriptions` on reconnect. No inventory / ledger
 * write happens here — Mo4 issuance reassembles the sale server-side.
 */
export default function NewPrescriptionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: visitId } = useLocalSearchParams<{ id: string }>();
  const [submitting, setSubmitting] = useState(false);

  return (
    <ScreenShell
      header={
        <TopBar
          title={t("visits.prescriptions.newTitle")}
          onBack={() => router.back()}
          right={null}
        />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="pb-8">
            <PrescriptionForm
              visitId={visitId ?? ""}
              submitLabel={t("actions.save")}
              submitting={submitting}
              onSubmit={async (values) => {
                setSubmitting(true);
                try {
                  await syncInsert("prescriptions", {
                    visit_id: values.visitId,
                    product_id: values.productId,
                    dispense_type: values.dispenseType,
                    quantity: values.quantity,
                    dosage: values.dosage ?? null,
                    frequency: values.frequency ?? null,
                    duration: values.duration ?? null,
                    notes: values.notes ?? null,
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
