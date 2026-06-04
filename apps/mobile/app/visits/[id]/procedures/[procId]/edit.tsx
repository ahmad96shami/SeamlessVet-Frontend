import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui";
import { ProcedureForm } from "@/components/forms/ProcedureForm";
import { ScreenShell, TopBar } from "@/components/layout";
import { dialog } from "@/stores/dialogStore";
import { useQuery } from "@/sync/hooks";
import type { ProcedureRow } from "@/sync/types";
import { syncDelete, syncUpdate } from "@/sync/writes";

export default function EditProcedureScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: visitId, procId } = useLocalSearchParams<{ id: string; procId: string }>();
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery<ProcedureRow>(`SELECT * FROM procedures WHERE id = ?`, [procId ?? ""]);
  const proc = data?.[0];

  return (
    <ScreenShell
      header={<TopBar title={t("visits.procedures.editTitle")} onBack={() => router.back()} right={null} />}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-4 pb-8">
            {!proc ? (
              <Text className="text-ink-500 mt-12 text-center text-[14px] font-tajawal">
                {t("visits.detail.notFound")}
              </Text>
            ) : (
              <>
                <ProcedureForm
                  visitId={visitId ?? proc.visit_id}
                  defaultValues={{
                    serviceId: proc.service_id ?? undefined,
                    price: proc.price,
                    resultText: proc.result_text ?? "",
                  }}
                  submitLabel={t("actions.save")}
                  submitting={submitting}
                  onSubmit={async (values) => {
                    setSubmitting(true);
                    try {
                      await syncUpdate("procedures", proc.id, {
                        service_id: values.serviceId ?? null,
                        price: values.price ?? 0,
                        result_text: values.resultText ?? null,
                      });
                      router.back();
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                />
                <Button
                  label={t("actions.delete")}
                  variant="soft"
                  onPress={() => {
                    void dialog
                      .confirm({
                        title: t("visits.procedures.editTitle"),
                        message: t("visits.procedures.deleteConfirm"),
                        confirmLabel: t("actions.delete"),
                        destructive: true,
                      })
                      .then(async (ok) => {
                        if (!ok) return;
                        setSubmitting(true);
                        try {
                          await syncDelete("procedures", proc.id);
                          router.back();
                        } finally {
                          setSubmitting(false);
                        }
                      });
                  }}
                  block
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
