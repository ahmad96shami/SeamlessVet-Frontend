import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { FarmForm } from "@/components/forms/FarmForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { FarmRow } from "@/sync/types";
import type { FarmRequest } from "@vet/shared";
import { syncUpdate } from "@/sync/writes";

export default function EditFarmScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: customerId, farmId } = useLocalSearchParams<{ id: string; farmId: string }>();
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery<FarmRow>(`SELECT * FROM farms WHERE id = ?`, [farmId ?? ""]);
  const farm = data?.[0];

  return (
    <ScreenShell
      header={
        <TopBar title={t("customers.farms.editTitle")} onBack={() => router.back()} right={null} />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="pb-8">
            {!farm ? (
              <Text className="text-ink-500 mt-12 text-center text-[14px] font-tajawal">
                {t("customers.farmDetail.notFound")}
              </Text>
            ) : (
              <FarmForm
                customerId={customerId ?? farm.customer_id}
                submitLabel={t("actions.save")}
                submitting={submitting}
                defaultValues={{
                  customerId: farm.customer_id,
                  name: farm.name,
                  kind: farm.kind as FarmRequest["kind"],
                  location: farm.location ?? "",
                  animalType: farm.animal_type ?? "",
                  headCount: farm.head_count ?? undefined,
                  notes: farm.notes ?? "",
                }}
                onSubmit={async (values) => {
                  setSubmitting(true);
                  try {
                    await syncUpdate("farms", farm.id, {
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
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
