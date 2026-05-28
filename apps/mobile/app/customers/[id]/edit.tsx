import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { CustomerForm } from "@/components/forms/CustomerForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { CustomerRow } from "@/sync/types";
import type { CustomerType } from "@vet/shared";
import { syncUpdate } from "@/sync/writes";

export default function EditCustomerScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery<CustomerRow>(`SELECT * FROM customers WHERE id = ?`, [id ?? ""]);
  const customer = data?.[0];

  return (
    <ScreenShell
      header={<TopBar title={t("customers.editTitle")} onBack={() => router.back()} right={null} />}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="pb-8">
            {!customer ? (
              <Text className="text-ink-500 mt-12 text-center text-[14px] font-tajawal">
                {t("customers.notFound")}
              </Text>
            ) : (
              <CustomerForm
                submitLabel={t("actions.save")}
                submitting={submitting}
                defaultValues={{
                  type: customer.type as CustomerType,
                  fullName: customer.full_name,
                  phonePrimary: customer.phone_primary ?? "",
                  phoneSecondary: customer.phone_secondary ?? "",
                  address: customer.address ?? "",
                  email: customer.email ?? "",
                  idNumber: customer.id_number ?? "",
                  notes: customer.notes ?? "",
                }}
                onSubmit={async (values) => {
                  setSubmitting(true);
                  try {
                    await syncUpdate("customers", customer.id, {
                      type: values.type,
                      full_name: values.fullName,
                      phone_primary: values.phonePrimary ?? null,
                      phone_secondary: values.phoneSecondary ?? null,
                      address: values.address ?? null,
                      email: values.email ?? null,
                      id_number: values.idNumber ?? null,
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
