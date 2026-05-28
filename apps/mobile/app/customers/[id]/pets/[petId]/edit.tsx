import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { PetForm } from "@/components/forms/PetForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { PetRow } from "@/sync/types";
import type { PetSex } from "@vet/shared";
import { syncUpdate } from "@/sync/writes";

export default function EditPetScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: customerId, petId } = useLocalSearchParams<{ id: string; petId: string }>();
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery<PetRow>(`SELECT * FROM pets WHERE id = ?`, [petId ?? ""]);
  const pet = data?.[0];

  return (
    <ScreenShell
      header={
        <TopBar title={t("customers.pets.editTitle")} onBack={() => router.back()} right={null} />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="pb-8">
            {!pet ? (
              <Text className="text-ink-500 mt-12 text-center text-[14px] font-tajawal">
                {t("customers.notFound")}
              </Text>
            ) : (
              <PetForm
                customerId={customerId ?? pet.customer_id}
                submitLabel={t("actions.save")}
                submitting={submitting}
                defaultValues={{
                  customerId: pet.customer_id,
                  name: pet.name,
                  species: pet.species ?? "",
                  breed: pet.breed ?? "",
                  sex: (pet.sex as PetSex | null) ?? undefined,
                  dateOfBirth: pet.date_of_birth ?? "",
                  colorMarks: pet.color_marks ?? "",
                  weightLatest: pet.weight_latest ?? undefined,
                  microchipNo: pet.microchip_no ?? "",
                  healthNotes: pet.health_notes ?? "",
                }}
                onSubmit={async (values) => {
                  setSubmitting(true);
                  try {
                    await syncUpdate("pets", pet.id, {
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
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
