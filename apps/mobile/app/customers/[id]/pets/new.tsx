import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import { PetForm } from "@/components/forms/PetForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { syncInsert } from "@/sync/writes";

export default function NewPetScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: customerId } = useLocalSearchParams<{ id: string }>();
  const [submitting, setSubmitting] = useState(false);

  return (
    <ScreenShell
      header={
        <TopBar title={t("customers.pets.newTitle")} onBack={() => router.back()} right={null} />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="pb-8">
            <PetForm
              customerId={customerId ?? ""}
              submitLabel={t("actions.save")}
              submitting={submitting}
              onSubmit={async (values) => {
                setSubmitting(true);
                try {
                  await syncInsert("pets", {
                    customer_id: values.customerId,
                    name: values.name,
                    species: values.species ?? null,
                    breed: values.breed ?? null,
                    sex: values.sex ?? null,
                    date_of_birth: values.dateOfBirth ?? null,
                    color_marks: values.colorMarks ?? null,
                    weight_latest: values.weightLatest ?? null,
                    microchip_no: values.microchipNo ?? null,
                    health_notes: values.healthNotes ?? null,
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
