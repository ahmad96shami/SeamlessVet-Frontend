import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import { FarmForm } from "@/components/forms/FarmForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { syncInsert } from "@/sync/writes";

export default function NewFarmScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: customerId } = useLocalSearchParams<{ id: string }>();
  const [submitting, setSubmitting] = useState(false);

  return (
    <ScreenShell
      header={
        <TopBar title={t("customers.farms.newTitle")} onBack={() => router.back()} right={null} />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="pb-8">
            <FarmForm
              customerId={customerId ?? ""}
              submitLabel={t("actions.save")}
              submitting={submitting}
              onSubmit={async (values) => {
                setSubmitting(true);
                try {
                  await syncInsert("farms", {
                    customer_id: values.customerId,
                    name: values.name,
                    kind: values.kind,
                    location: values.location ?? null,
                    animal_type: values.animalType ?? null,
                    head_count: values.headCount ?? null,
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
