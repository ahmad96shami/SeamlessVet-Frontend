import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  buildExamFeeInvoiceRequest,
  PAYMENT_METHOD_VALUES,
  type PaymentMethod,
} from "@vet/shared";

import { Button, Card, Chip, Input, Money, Pill } from "@/components/ui";
import { ScreenShell, TopBar } from "@/components/layout";
import { sendOrQueue } from "@/services/sendOrQueue";
import { useQuery } from "@/sync/hooks";
import type { CustomerRow, PetRow, VisitRow } from "@/sync/types";

interface SystemSettingsRow {
  id: string;
  default_exam_fee: number | null;
}

/**
 * Mo4.3 — standalone Kashfiyya (exam-fee) invoice. POSTs to
 * `/visits/{id}/exam-fee-invoice` through the REST queue (Mo4.1). No line items, no
 * inventory: the whole invoice is the exam fee. The doctor optionally overrides the
 * amount; leaving it blank falls back server-side to the visit's `exam_fee_applied`
 * and finally to `system_settings.default_exam_fee` (M7 task 6).
 *
 * The fee preview reads the same fallback chain on-device so the doctor isn't
 * surprised by what the server picks. The server validates non-negative amounts.
 */
export default function ExamFeeInvoiceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: visitId } = useLocalSearchParams<{ id: string }>();
  const id = visitId ?? "";

  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amountText, setAmountText] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: visits } = useQuery<VisitRow>(`SELECT * FROM visits WHERE id = ?`, [id]);
  const visit = visits?.[0];

  const { data: customers } = useQuery<CustomerRow>(
    `SELECT * FROM customers WHERE id = ?`,
    [visit?.customer_id ?? ""],
  );
  const customer = customers?.[0];

  const { data: pets } = useQuery<PetRow>(`SELECT * FROM pets WHERE id = ?`, [visit?.pet_id ?? ""]);
  const pet = pets?.[0];

  const { data: settings } = useQuery<SystemSettingsRow>(`SELECT * FROM system_settings LIMIT 1`);
  const defaultFee = settings?.[0]?.default_exam_fee ?? 0;

  const parsedAmount = useMemo(() => {
    const trimmed = amountText.trim();
    if (!trimmed) return undefined;
    const value = Number(trimmed);
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  }, [amountText]);

  const previewTotal = useMemo(() => {
    if (parsedAmount !== undefined) return parsedAmount;
    return visit?.exam_fee_applied ?? defaultFee;
  }, [parsedAmount, visit?.exam_fee_applied, defaultFee]);

  if (!visit) {
    return (
      <ScreenShell
        header={<TopBar title={t("billing.field.notFound")} onBack={() => router.back()} right={null} />}
      >
        <View className="items-center pt-12">
          <Text className="text-ink-500 text-[14px] font-tajawal">{t("billing.field.notFound")}</Text>
        </View>
      </ScreenShell>
    );
  }

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      // amount is optional — undefined lets the server fall back to the visit's
      // applied fee, then to system_settings.default_exam_fee. Payment leg covers
      // the *previewed* total so server validation `payments <= total` holds.
      const descriptor = buildExamFeeInvoiceRequest(id, {
        amount: parsedAmount,
        payments: [{ method, amount: previewTotal }],
      });
      const result = await sendOrQueue(descriptor);
      Alert.alert(
        t("billing.exam.issuedTitle"),
        result.queued ? t("billing.exam.queuedBody") : t("billing.exam.issuedBody"),
        [{ text: t("actions.close") }],
      );
      router.back();
    } catch (err) {
      const message = (err as Error).message ?? "issuance failed";
      Alert.alert(t("billing.exam.failed"), message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell
      header={<TopBar title={t("billing.exam.title")} onBack={() => router.back()} right={null} />}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-4 pb-8">
            <Card className="gap-2 p-4">
              <View className="gap-0.5">
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
              <View className="flex-row flex-wrap gap-1.5 pt-1">
                <Pill tone="teal" label={visit.visit_number ?? t("visits.noNumber")} />
              </View>
            </Card>

            <Section title={t("billing.exam.amountLabel")}>
              <Input
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                placeholder={String(visit.exam_fee_applied ?? defaultFee ?? 0)}
              />
              <Text className="text-ink-500 text-[12px] font-tajawal">
                {t("billing.exam.amountHint")}
              </Text>
            </Section>

            <Section title={t("billing.exam.paymentTitle")}>
              <View className="flex-row flex-wrap gap-2">
                {PAYMENT_METHOD_VALUES.map((m) => (
                  <Chip
                    key={m}
                    label={t(`paymentMethod.${m}`)}
                    active={method === m ? "teal" : "off"}
                    onPress={() => setMethod(m)}
                  />
                ))}
              </View>
            </Section>

            <Card flat className="gap-1.5 p-3">
              <Row label={t("billing.exam.totalLabel")}>
                <Money value={previewTotal} />
              </Row>
            </Card>

            <Button
              label={t("billing.exam.issue")}
              variant="teal"
              onPress={onSubmit}
              loading={submitting}
              disabled={submitting || previewTotal <= 0}
              block
            />
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-navy-900 text-[13px] font-tajawal-bold">{label}</Text>
      {children}
    </View>
  );
}
