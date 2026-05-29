import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { MedicationPriceForm } from "@/components/forms/MedicationPriceForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import { syncInsert } from "@/sync/writes";

/**
 * Add a medication-price override to a draft contract (Mo5.2). Already-overridden products are
 * hidden from the picker (one override per product). The new row uploads via
 * `PUT /sync/contract_medication_prices`; the server rejects it if the parent contract isn't a
 * draft (the section only surfaces the add button for drafts).
 */
export default function NewMedicationPriceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: contractId } = useLocalSearchParams<{ id: string }>();
  const [submitting, setSubmitting] = useState(false);

  const { data: existing } = useQuery<{ product_id: string }>(
    `SELECT product_id FROM contract_medication_prices WHERE contract_id = ?`,
    [contractId ?? ""],
  );
  const usedProductIds = (existing ?? []).map((r) => r.product_id);

  return (
    <ScreenShell
      header={<TopBar title={t("finance.contracts.medPrices.addTitle")} onBack={() => router.back()} right={null} />}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="pb-8">
            <MedicationPriceForm
              usedProductIds={usedProductIds}
              submitLabel={t("actions.save")}
              submitting={submitting}
              onSubmit={async (values) => {
                if (!contractId) return;
                setSubmitting(true);
                try {
                  await syncInsert("contract_medication_prices", {
                    contract_id: contractId,
                    product_id: values.productId,
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
