import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { MedicationPriceForm } from "@/components/forms/MedicationPriceForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { ContractMedicationPriceRow } from "@/sync/types";
import { syncUpdate } from "@/sync/writes";

/**
 * Edit a draft contract's medication-price override (Mo5.2). The product is locked (only the price
 * is mutable, matching the server PATCH); the change rides `/sync/contract_medication_prices/{id}`.
 */
export default function EditMedicationPriceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { priceId } = useLocalSearchParams<{ id: string; priceId: string }>();
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery<ContractMedicationPriceRow>(
    `SELECT * FROM contract_medication_prices WHERE id = ?`,
    [priceId ?? ""],
  );
  const row = data?.[0];

  if (!row) {
    return (
      <ScreenShell header={<TopBar title={t("finance.contracts.medPrices.editTitle")} onBack={() => router.back()} right={null} />}>
        <View className="items-center pt-12">
          <Text className="text-ink-500 text-[14px] font-tajawal">{t("finance.contracts.medPrices.empty")}</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      header={<TopBar title={t("finance.contracts.medPrices.editTitle")} onBack={() => router.back()} right={null} />}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="pb-8">
            <MedicationPriceForm
              lockProduct
              defaultValues={{ productId: row.product_id, contractPrice: row.contract_price }}
              submitLabel={t("actions.save")}
              submitting={submitting}
              onSubmit={async (values) => {
                setSubmitting(true);
                try {
                  await syncUpdate("contract_medication_prices", row.id, {
                    contract_price: values.contractPrice,
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
