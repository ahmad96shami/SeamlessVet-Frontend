import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui";
import { ContractForm } from "@/components/forms/ContractForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { ContractRow } from "@/sync/types";
import { syncUpdate } from "@/sync/writes";

/**
 * Edit a **draft** contract's terms (Mo5.1). Only drafts are editable on the device — an active
 * contract is server-authoritative (PRD §8.4), so this guards and shows the draft-only notice if
 * the contract has moved past draft (the detail's edit pencil already hides for non-drafts). The
 * PATCH rides `/sync/contracts/{id}` on reconnect.
 */
export default function EditContractScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [submitting, setSubmitting] = useState(false);

  const { data: contracts } = useQuery<ContractRow>(`SELECT * FROM contracts WHERE id = ?`, [id ?? ""]);
  const contract = contracts?.[0];

  if (!contract) {
    return (
      <ScreenShell header={<TopBar title={t("finance.contracts.editTitle")} onBack={() => router.back()} right={null} />}>
        <View className="items-center pt-12">
          <Text className="text-ink-500 text-[14px] font-tajawal">{t("finance.contracts.empty")}</Text>
        </View>
      </ScreenShell>
    );
  }

  if (contract.status !== "draft") {
    return (
      <ScreenShell header={<TopBar title={t("finance.contracts.editTitle")} onBack={() => router.back()} right={null} />}>
        <Card flat className="bg-amber-soft mt-2 p-3">
          <Text className="text-amber-ink text-center text-[13px] font-tajawal-bold">
            {t("finance.contracts.medPrices.draftOnly")}
          </Text>
        </Card>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell header={<TopBar title={t("finance.contracts.editTitle")} onBack={() => router.back()} right={null} />}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="pb-8">
            <ContractForm
              customerId={contract.customer_id}
              defaultValues={{
                periodStart: contract.period_start,
                periodEnd: contract.period_end ?? "",
                totalPrice: contract.total_price ?? undefined,
                expectedVisitCount: contract.expected_visit_count ?? undefined,
                animalType: contract.animal_type ?? "",
                animalCount: contract.animal_count ?? undefined,
              }}
              submitLabel={t("actions.save")}
              submitting={submitting}
              onSubmit={async (values) => {
                setSubmitting(true);
                try {
                  await syncUpdate("contracts", contract.id, {
                    period_start: values.periodStart,
                    period_end: values.periodEnd ?? null,
                    total_price: values.totalPrice ?? null,
                    expected_visit_count: values.expectedVisitCount ?? null,
                    animal_type: values.animalType ?? null,
                    animal_count: values.animalCount ?? null,
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
