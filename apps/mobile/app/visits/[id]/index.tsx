import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  formatDate,
  SEVERITY_VALUES,
  VisitPatchRequestSchema,
  type Severity,
  type VisitPatchRequest,
} from "@vet/shared";

import { Button, Card, Pill } from "@/components/ui";
import { ChipSelect, FormField, NumberFieldTransform } from "@/components/forms";
import { ScreenShell, TopBar } from "@/components/layout";
import { AttachmentsSection } from "@/components/visit/AttachmentsSection";
import { ProceduresSection } from "@/components/visit/ProceduresSection";
import { PrescriptionsSection } from "@/components/visit/PrescriptionsSection";
import { VaccinationsSection } from "@/components/visit/VaccinationsSection";
import { omitEmptyStrings } from "@/lib/forms";
import { useQuery } from "@/sync/hooks";
import type { CustomerRow, PetRow, VisitRow } from "@/sync/types";
import { syncUpdate } from "@/sync/writes";

const TERMINAL = new Set(["completed", "cancelled"]);
type StatusKey = "open" | "in_progress" | "completed" | "cancelled";

const STATUS_TONE: Record<StatusKey, "teal" | "amber" | "green" | "red"> = {
  open: "teal",
  in_progress: "amber",
  completed: "green",
  cancelled: "red",
};

/**
 * Visit detail / edit (Mo2.2). The form mirrors `VisitPatchRequest` (PATCH-only — terminal
 * transitions go through dedicated `status` writes). Writes go through the local SQLite +
 * PowerSync's `/sync/visits/{id}` PATCH upload path.
 *
 * Conflict rule (PRD §8.4): the doctor-device is authoritative while the visit is open/in-
 * progress; once it's completed/cancelled the server wins. We enforce that client-side by
 * disabling the form + actions when the row is terminal — the server still rejects edits
 * with `visit_server_authoritative` if a stale device tries.
 *
 * The procedures / prescriptions / vaccinations sub-sections land in Mo2.3–5; for now
 * the page just hosts the clinical fields and the complete/cancel actions.
 */
export default function VisitDetailScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [submitting, setSubmitting] = useState<"save" | "complete" | "cancel" | null>(null);

  const { data: visits } = useQuery<VisitRow>(`SELECT * FROM visits WHERE id = ?`, [id ?? ""]);
  const visit = visits?.[0];

  const { data: customers } = useQuery<CustomerRow>(
    `SELECT * FROM customers WHERE id = ?`,
    [visit?.customer_id ?? ""],
  );
  const customer = customers?.[0];

  const { data: pets } = useQuery<PetRow>(`SELECT * FROM pets WHERE id = ?`, [visit?.pet_id ?? ""]);
  const pet = pets?.[0];

  const isTerminal = visit ? TERMINAL.has(visit.status) : false;

  const form = useForm<VisitPatchRequest>({
    resolver: zodResolver(VisitPatchRequestSchema),
    defaultValues: emptyPatchDefaults(),
  });

  // Re-seed the form when the visit row first lands (PowerSync `useQuery` is async on first
  // mount). Without this the form would freeze on the empty initial defaults.
  useEffect(() => {
    if (!visit) return;
    form.reset({
      chiefComplaint: visit.chief_complaint ?? "",
      symptoms: visit.symptoms ?? "",
      temperature: visit.temperature ?? undefined,
      heartRate: visit.heart_rate ?? undefined,
      respiratoryRate: visit.respiratory_rate ?? undefined,
      weight: visit.weight ?? undefined,
      clinicalNotes: visit.clinical_notes ?? "",
      preliminaryDiagnosis: visit.preliminary_diagnosis ?? "",
      finalDiagnosis: visit.final_diagnosis ?? "",
      severity: (visit.severity as Severity | null) ?? undefined,
      icdVetCode: visit.icd_vet_code ?? "",
      examFeeApplied: visit.exam_fee_applied ?? undefined,
    });
    // form.reset is stable; only seed when the visit id/updated_at changes.
  }, [visit?.id, visit?.updated_at]);

  if (!visit) {
    return (
      <ScreenShell
        header={<TopBar title={t("visits.detail.notFound")} onBack={() => router.back()} right={null} />}
      >
        <View className="items-center pt-12">
          <Text className="text-ink-500 text-[14px] font-tajawal">{t("visits.detail.notFound")}</Text>
        </View>
      </ScreenShell>
    );
  }

  const onSave = form.handleSubmit(async (values) => {
    setSubmitting("save");
    try {
      const v = omitEmptyStrings(values);
      await syncUpdate("visits", visit.id, {
        chief_complaint: v.chiefComplaint ?? null,
        symptoms: v.symptoms ?? null,
        temperature: v.temperature ?? null,
        heart_rate: v.heartRate ?? null,
        respiratory_rate: v.respiratoryRate ?? null,
        weight: v.weight ?? null,
        clinical_notes: v.clinicalNotes ?? null,
        preliminary_diagnosis: v.preliminaryDiagnosis ?? null,
        final_diagnosis: v.finalDiagnosis ?? null,
        severity: v.severity ?? null,
        icd_vet_code: v.icdVetCode ?? null,
        exam_fee_applied: v.examFeeApplied ?? null,
      });
    } catch (err) {
      Alert.alert(t("visits.assessment.save"), (err as Error).message ?? "Save failed");
    } finally {
      setSubmitting(null);
    }
  });

  const transitionTo = (next: "completed" | "cancelled", labelKey: "actions.completeTitle" | "actions.cancelTitle", bodyKey: "actions.completeBody" | "actions.cancelBody") => {
    Alert.alert(t(`visits.${labelKey}`), t(`visits.${bodyKey}`), [
      { text: t("actions.cancel"), style: "cancel" },
      {
        text: t(next === "completed" ? "visits.actions.complete" : "visits.actions.cancel"),
        style: next === "cancelled" ? "destructive" : "default",
        onPress: async () => {
          setSubmitting(next === "completed" ? "complete" : "cancel");
          try {
            await syncUpdate("visits", visit.id, {
              status: next,
              ended_at: new Date().toISOString(),
            });
          } catch (err) {
            Alert.alert(t("visits.actions.complete"), (err as Error).message ?? "Save failed");
          } finally {
            setSubmitting(null);
          }
        },
      },
    ]);
  };

  return (
    <ScreenShell
      header={
        <TopBar
          title={visit.visit_number ?? t("visits.noNumber")}
          onBack={() => router.back()}
          right={null}
        />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-4 pb-8">
            <Card className="gap-2 p-4">
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-1 gap-0.5">
                  <Text className="text-ink-500 text-[12px] font-tajawal">
                    {t("visits.create.customer")}
                  </Text>
                  <Text className="text-navy-900 text-[16px] font-tajawal-extrabold" numberOfLines={1}>
                    {customer?.full_name ?? "—"}
                  </Text>
                  <Text className="text-ink-500 text-[12px] font-tajawal">
                    {pet?.name ?? t("visits.noPet")}
                  </Text>
                </View>
                <Pill tone={STATUS_TONE[visit.status as StatusKey] ?? "neutral"} label={t(`visitStatus.${visit.status}`)} />
              </View>
              <View className="flex-row flex-wrap gap-1.5 pt-1">
                {visit.started_at ? (
                  <Pill tone="neutral" label={`${t("visits.detail.startedAt")}: ${formatDate(visit.started_at, i18n.resolvedLanguage)}`} />
                ) : null}
                {visit.contract_id ? <Pill tone="teal" label={t("nav.contracts")} /> : null}
                {visit.batch_id ? (
                  <Pill tone="teal" label={t("contracts.batches.singular", { defaultValue: "دفعة" })} />
                ) : null}
              </View>
            </Card>

            {isTerminal ? (
              <Card flat className="bg-amber-soft p-3">
                <Text className="text-amber-ink text-center text-[13px] font-tajawal-bold">
                  {t("visits.detail.lockedHint")}
                </Text>
              </Card>
            ) : null}

            <Section title={t("visits.assessment.title")}>
              <FormField
                control={form.control}
                name="chiefComplaint"
                label={t("visits.assessment.chiefComplaint")}
                multiline
              />
              <FormField
                control={form.control}
                name="symptoms"
                label={t("visits.assessment.symptoms")}
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
            </Section>

            <Section title={t("visits.diagnosis.title")}>
              <FormField
                control={form.control}
                name="preliminaryDiagnosis"
                label={t("visits.diagnosis.preliminary")}
                multiline
              />
              <FormField
                control={form.control}
                name="finalDiagnosis"
                label={t("visits.diagnosis.final")}
                multiline
              />
              <ChipSelect
                control={form.control}
                name="severity"
                label={t("visits.diagnosis.severity")}
                options={SEVERITY_VALUES.map((v) => ({ value: v, label: t(`severity.${v}`) }))}
                allowClear
                clearLabel={t("visits.diagnosis.severityNone")}
              />
              <FormField
                control={form.control}
                name="icdVetCode"
                label={t("visits.diagnosis.icdVetCode")}
                autoCapitalize="none"
              />
              <FormField
                control={form.control}
                name="examFeeApplied"
                label={t("invoiceType.exam_fee")}
                keyboardType="decimal-pad"
                transform={NumberFieldTransform}
              />
            </Section>

            <ProceduresSection visitId={visit.id} isTerminal={isTerminal} />

            <PrescriptionsSection visitId={visit.id} isTerminal={isTerminal} />

            <VaccinationsSection visitId={visit.id} isTerminal={isTerminal} />

            <AttachmentsSection visitId={visit.id} isTerminal={isTerminal} />

            {!isTerminal ? (
              <View className="mt-2 gap-2">
                <Button
                  label={t("visits.assessment.save")}
                  onPress={onSave}
                  loading={submitting === "save"}
                  block
                />
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      label={t("visits.actions.complete")}
                      variant="teal"
                      onPress={() => transitionTo("completed", "actions.completeTitle", "actions.completeBody")}
                      loading={submitting === "complete"}
                      block
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label={t("visits.actions.cancel")}
                      variant="soft"
                      onPress={() => transitionTo("cancelled", "actions.cancelTitle", "actions.cancelBody")}
                      loading={submitting === "cancel"}
                      block
                    />
                  </View>
                </View>
              </View>
            ) : null}

            <View className="mt-2 gap-2">
              <Button
                label={t("billing.actions.openField")}
                variant="primary"
                onPress={() => router.push(`/visits/${visit.id}/billing/field`)}
                block
              />
              <Button
                label={t("billing.actions.openExam")}
                variant="soft"
                onPress={() => router.push(`/visits/${visit.id}/billing/exam`)}
                block
              />
              <Button
                label={t("visits.scheduleFollowUp.action")}
                variant="soft"
                onPress={() => router.push(`/visits/${visit.id}/follow-up`)}
                block
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">{title}</Text>
      <Card className="gap-3 p-4">{children}</Card>
    </View>
  );
}

function emptyPatchDefaults(): VisitPatchRequest {
  return {
    chiefComplaint: "",
    symptoms: "",
    temperature: undefined,
    heartRate: undefined,
    respiratoryRate: undefined,
    weight: undefined,
    clinicalNotes: "",
    preliminaryDiagnosis: "",
    finalDiagnosis: "",
    severity: undefined,
    icdVetCode: "",
    examFeeApplied: undefined,
  };
}
