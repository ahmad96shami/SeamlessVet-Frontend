import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VisitCreateRequestSchema, type VisitCreateRequest } from "@vet/shared";

import { Button, Card, Pill } from "@/components/ui";
import { ChipSelect, FormField, NumberFieldTransform } from "@/components/forms";
import { ScreenShell, TopBar } from "@/components/layout";
import { omitEmptyStrings } from "@/lib/forms";
import { nextVisitNumber } from "@/lib/visitNumber";
import { useQuery } from "@/sync/hooks";
import {
  findActiveContractIdForCustomer,
  findOpenBatchIdForCustomer,
  getDefaultExamFee,
  listLocalVisitNumbers,
} from "@/sync/queries";
import type { CustomerRow, PetRow } from "@/sync/types";
import { syncInsert } from "@/sync/writes";
import { useAuthStore } from "@/stores/authStore";

/**
 * Open a new **field** visit (Mo2.2). The customer is fixed by the route query (passed in from
 * the customer-detail "زيارة جديدة" CTA); the doctor is the logged-in field user; visit_type is
 * hardcoded `field` (this is the field mobile app).
 *
 * On submit:
 *   1. Auto-link the customer's active `contract_id` + open `batch_id` (PRD §6.6 — drives
 *      contract-aware pricing at Mo4 issuance).
 *   2. Mint `{numberPrefix}-{seq}` client-side (Mo2 exit criterion) by scanning the doctor's
 *      local visits — falls back to `null` when no prefix is assigned, mirroring the web path.
 *   3. Write the row into local SQLite; PowerSync drains it through `PUT /sync/visits` on
 *      reconnect.
 *   4. Navigate to the visit detail screen so the doctor can continue capturing services /
 *      prescriptions / vaccinations (Mo2.3–5).
 */
export default function NewVisitScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();
  const user = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);

  const { data: customers } = useQuery<CustomerRow>(
    `SELECT * FROM customers WHERE id = ?`,
    [customerId ?? ""],
  );
  const customer = customers?.[0];

  const { data: pets } = useQuery<PetRow>(
    `SELECT * FROM pets WHERE customer_id = ? ORDER BY name`,
    [customerId ?? ""],
  );

  const form = useForm<VisitCreateRequest>({
    resolver: zodResolver(VisitCreateRequestSchema),
    defaultValues: {
      visitType: "field",
      customerId: customerId ?? "",
      doctorId: user?.userId ?? "",
      chiefComplaint: "",
      symptoms: "",
      clinicalNotes: "",
      examFeeApplied: undefined,
    },
  });

  // Pre-fill the exam fee from system_settings once it streams in — the doctor can adjust
  // per visit. Empty string → kept blank so the form's optional() lets the field stay null.
  useEffect(() => {
    void (async () => {
      const def = await getDefaultExamFee();
      if (def != null && form.getValues("examFeeApplied") == null) {
        form.setValue("examFeeApplied", def);
      }
    })();
    // Only run on mount; we don't want to clobber the doctor's edits as settings refresh.
  }, []);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!customer || !user?.userId) {
      Alert.alert(t("visits.newTitle"), t("visits.create.pickCustomerFirst"));
      return;
    }
    setSubmitting(true);
    try {
      const [contractId, batchId, prior] = await Promise.all([
        findActiveContractIdForCustomer(customer.id),
        findOpenBatchIdForCustomer(customer.id),
        listLocalVisitNumbers(user.userId),
      ]);
      const visitNumber = nextVisitNumber(user.numberPrefix, prior);
      const payload = omitEmptyStrings(values);
      const id = await syncInsert("visits", {
        visit_type: "field",
        visit_number: visitNumber,
        customer_id: customer.id,
        pet_id: payload.petId ?? null,
        doctor_id: user.userId,
        contract_id: contractId,
        batch_id: batchId,
        status: "open",
        started_at: new Date().toISOString(),
        chief_complaint: payload.chiefComplaint ?? null,
        symptoms: payload.symptoms ?? null,
        temperature: payload.temperature ?? null,
        heart_rate: payload.heartRate ?? null,
        respiratory_rate: payload.respiratoryRate ?? null,
        weight: payload.weight ?? null,
        clinical_notes: payload.clinicalNotes ?? null,
        exam_fee_applied: payload.examFeeApplied ?? null,
      });
      router.replace({ pathname: "/visits/[id]", params: { id } });
    } catch (err) {
      Alert.alert(t("visits.newTitle"), (err as Error).message ?? "Save failed");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <ScreenShell
      header={<TopBar title={t("visits.newTitle")} onBack={() => router.back()} right={null} />}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-4 pb-8">
            <Card className="flex-row items-center gap-3 p-3">
              <View className="flex-1">
                <Text className="text-ink-500 text-[12px] font-tajawal">
                  {t("visits.create.customer")}
                </Text>
                <Text className="text-navy-900 mt-0.5 text-[15px] font-tajawal-extrabold" numberOfLines={1}>
                  {customer?.full_name ?? "—"}
                </Text>
              </View>
              {user?.numberPrefix ? (
                <Pill tone="teal" label={user.numberPrefix} />
              ) : null}
            </Card>

            {(pets ?? []).length > 0 ? (
              <ChipSelect
                control={form.control}
                name="petId"
                label={t("visits.create.pet")}
                options={(pets ?? []).map((p) => ({ value: p.id, label: p.name }))}
                allowClear
                clearLabel={t("visits.create.noPet")}
              />
            ) : null}

            <FormField
              control={form.control}
              name="chiefComplaint"
              label={t("visits.create.chiefComplaint")}
              multiline
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField
                  control={form.control}
                  name="temperature"
                  label={t("visits.assessment.temperature")}
                  keyboardType="decimal-pad"
                  transform={NumberFieldTransform}
                />
              </View>
              <View className="flex-1">
                <FormField
                  control={form.control}
                  name="weight"
                  label={t("visits.assessment.weight")}
                  keyboardType="decimal-pad"
                  transform={NumberFieldTransform}
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField
                  control={form.control}
                  name="heartRate"
                  label={t("visits.assessment.heartRate")}
                  keyboardType="numeric"
                  transform={NumberFieldTransform}
                />
              </View>
              <View className="flex-1">
                <FormField
                  control={form.control}
                  name="respiratoryRate"
                  label={t("visits.assessment.respiratoryRate")}
                  keyboardType="numeric"
                  transform={NumberFieldTransform}
                />
              </View>
            </View>

            <FormField
              control={form.control}
              name="clinicalNotes"
              label={t("visits.assessment.clinicalNotes")}
              multiline
            />

            <FormField
              control={form.control}
              name="examFeeApplied"
              label={t("invoiceType.exam_fee")}
              keyboardType="decimal-pad"
              transform={NumberFieldTransform}
            />

            <View className="mt-2">
              <Button
                label={t("visits.actions.start")}
                variant="teal"
                onPress={handleSubmit}
                loading={submitting}
                block
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
