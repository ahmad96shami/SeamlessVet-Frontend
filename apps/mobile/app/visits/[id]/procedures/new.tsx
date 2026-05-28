import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ProcedureForm } from "@/components/forms/ProcedureForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { syncInsert } from "@/sync/writes";

export default function NewProcedureScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: visitId } = useLocalSearchParams<{ id: string }>();
  const [submitting, setSubmitting] = useState(false);

  return (
    <ScreenShell
      header={<TopBar title={t("visits.procedures.newTitle")} onBack={() => router.back()} right={null} />}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="pb-8">
            <ProcedureForm
              visitId={visitId ?? ""}
              submitLabel={t("actions.save")}
              submitting={submitting}
              onSubmit={async (values) => {
                setSubmitting(true);
                try {
                  await syncInsert("procedures", {
                    visit_id: values.visitId,
                    service_id: values.serviceId ?? null,
                    price: values.price ?? 0,
                    result_text: values.resultText ?? null,
                    result_file_url: values.resultFileUrl ?? null,
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
