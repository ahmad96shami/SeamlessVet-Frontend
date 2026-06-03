import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  buildReceiptVoucherRequest,
  PAYMENT_METHOD_VALUES,
  type PaymentMethod,
} from "@vet/shared";

import { Button, Card, Chip, Input, Money } from "@/components/ui";
import {
  ChequeFields,
  chequeDetailsValid,
  chequeRequestFields,
  EMPTY_CHEQUE,
  type ChequeDetails,
} from "@/components/ChequeFields";
import { ScreenShell, TopBar } from "@/components/layout";
import { sendOrQueue } from "@/services/sendOrQueue";
import { useQuery } from "@/sync/hooks";
import type { CustomerRow } from "@/sync/types";

interface LedgerRow {
  id: string;
  customer_id: string;
  balance: number;
  status: string;
  closed_at: string | null;
  updated_at: string;
}

/**
 * Mo4.4 — Receipt Voucher (Sanad Qabd). POSTs to `/receipt-vouchers` via `sendOrQueue`
 * so a payment captured offline replays on reconnect. Issuance posts a server-side
 * `receipt_voucher` ledger credit (negative amount) reducing the customer's owed
 * balance; the local mirror picks up the new `ledger_entries` row through PowerSync,
 * so the customer detail balance refreshes a moment after the server confirms.
 *
 * Voucher `method` mirrors PaymentMethod *minus* `credit` (a voucher records money
 * actually received). UI exposes cash/card/bank_transfer/cheque; `credit` is filtered
 * out before render. Cheque (M19) settles immediately and reveals the reference trio
 * (number/bank/due date) — Mo9.4, mirroring web W14.
 *
 * Print: deferred. PRD §8.5 step 7 / §16 calls out a Bluetooth thermal printer as an
 * Open Decision; system `expo-print` lands as a follow-up once that decision is made
 * (Mo4 exit criteria only require issuance + balance drop + statement-share, all
 * unchanged by the missing print button).
 */
const VOUCHER_METHODS = PAYMENT_METHOD_VALUES.filter((m) => m !== "credit");

export default function ReceiptVoucherScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: customerId } = useLocalSearchParams<{ id: string }>();
  const id = customerId ?? "";

  const [amountText, setAmountText] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cheque, setCheque] = useState<ChequeDetails>(EMPTY_CHEQUE);
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: customers } = useQuery<CustomerRow>(
    `SELECT * FROM customers WHERE id = ?`,
    [id],
  );
  const customer = customers?.[0];

  const { data: ledgers } = useQuery<LedgerRow>(
    `SELECT * FROM ledgers WHERE customer_id = ?`,
    [id],
  );
  const ledger = ledgers?.[0];

  const parsedAmount = useMemo(() => {
    const trimmed = amountText.trim();
    if (!trimmed) return 0;
    const value = Number(trimmed);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [amountText]);

  if (!customer) {
    return (
      <ScreenShell
        header={<TopBar title={t("customers.notFound")} onBack={() => router.back()} right={null} />}
      >
        <View className="items-center pt-12">
          <Text className="text-ink-500 text-[14px] font-tajawal">{t("customers.notFound")}</Text>
        </View>
      </ScreenShell>
    );
  }

  const onSubmit = async () => {
    if (parsedAmount <= 0) {
      Alert.alert(t("billing.voucher.failed"), t("billing.voucher.amountPositive"));
      return;
    }
    setSubmitting(true);
    try {
      const descriptor = buildReceiptVoucherRequest({
        customerId: id,
        amount: parsedAmount,
        method,
        notes: notes.trim() || undefined,
        ...chequeRequestFields(method, cheque),
      });
      const result = await sendOrQueue(descriptor);
      Alert.alert(
        t("billing.voucher.issuedTitle"),
        result.queued ? t("billing.voucher.queuedBody") : t("billing.voucher.issuedBody"),
        [{ text: t("actions.close") }],
      );
      router.back();
    } catch (err) {
      const message = (err as Error).message ?? "voucher failed";
      Alert.alert(t("billing.voucher.failed"), message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell
      header={<TopBar title={t("billing.voucher.title")} onBack={() => router.back()} right={null} />}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-4 pb-8">
            <Card className="gap-2 p-4">
              <Text className="text-ink-500 text-[12px] font-tajawal">
                {t("nav.customers")}
              </Text>
              <Text className="text-navy-900 text-[16px] font-tajawal-extrabold" numberOfLines={1}>
                {customer.full_name}
              </Text>
              {ledger ? (
                <View className="flex-row items-center justify-between pt-2">
                  <Text className="text-ink-500 text-[12px] font-tajawal">
                    {t("billing.voucher.amountLabel")}
                  </Text>
                  <Money value={ledger.balance} />
                </View>
              ) : null}
            </Card>

            <Section title={t("billing.voucher.amountLabel")}>
              <Input
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </Section>

            <Section title={t("billing.voucher.methodTitle")}>
              <View className="flex-row flex-wrap gap-2">
                {VOUCHER_METHODS.map((m) => (
                  <Chip
                    key={m}
                    label={t(`paymentMethod.${m}`)}
                    active={method === m ? "teal" : "off"}
                    onPress={() => {
                      setMethod(m);
                      if (m !== "cheque") setCheque(EMPTY_CHEQUE);
                    }}
                  />
                ))}
              </View>
              {method === "cheque" ? <ChequeFields value={cheque} onChange={setCheque} /> : null}
            </Section>

            <Section title={t("billing.voucher.notesLabel")}>
              <Input
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: "top" }}
              />
            </Section>

            <Button
              label={t("billing.voucher.issue")}
              variant="teal"
              onPress={onSubmit}
              loading={submitting}
              disabled={submitting || parsedAmount <= 0 || !chequeDetailsValid(method, cheque)}
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
