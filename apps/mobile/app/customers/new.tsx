import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import { CustomerForm } from "@/components/forms/CustomerForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { useAuthStore } from "@/stores/authStore";
import { syncInsert } from "@/sync/writes";

/**
 * On-site customer registration (PRD §4 Part 2; Mo2 task 1). Writes a row into the local
 * `customers` table — PowerSync's upload connector mirrors it through `PUT /sync/customers`
 * on reconnect. `assigned_doctor_id` is set to the logged-in field doctor so the new row
 * lands in their own sync bucket immediately (no admin reassignment needed).
 */
export default function NewCustomerScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.userId);
  const [submitting, setSubmitting] = useState(false);

  return (
    <ScreenShell
      header={<TopBar title={t("customers.newTitle")} onBack={() => router.back()} right={null} />}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="pb-8">
            <CustomerForm
              submitLabel={t("actions.save")}
              submitting={submitting}
              onSubmit={async (values) => {
                setSubmitting(true);
                try {
                  const id = await syncInsert("customers", {
                    type: values.type,
                    full_name: values.fullName,
                    phone_primary: values.phonePrimary ?? null,
                    phone_secondary: values.phoneSecondary ?? null,
                    address: values.address ?? null,
                    email: values.email ?? null,
                    id_number: values.idNumber ?? null,
                    notes: values.notes ?? null,
                    assigned_doctor_id: userId ?? null,
                  });
                  router.replace(`/customers/${id}`);
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
