import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  buildReceiptVoucherRequest,
  PAYMENT_METHOD_VALUES,
  type PaymentMethod,
} from "@vet/shared";

import {
  AmountEntry,
  Button,
  Card,
  Chip,
  Divider,
  FieldLabel,
  Input,
  Money,
  Photo,
  photoKindForCustomerType,
} from "@/components/ui";
import {
  ChequeFields,
  chequeDetailsValid,
  chequeRequestFields,
  EMPTY_CHEQUE,
  type ChequeDetails,
} from "@/components/ChequeFields";
import { Footer, ScreenShell, TopBar } from "@/components/layout";
import { formatAmount } from "@/lib/numerals";
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

  const balance = ledger?.balance ?? 0;
  const balanceAfter = Math.round((balance - parsedAmount) * 100) / 100;

  return (
    <ScreenShell
      staticBody
      header={<TopBar title={t("billing.voucher.title")} onBack={() => router.back()} right={null} />}
      footer={
        <Footer>
          <Button
            label={t("billing.voucher.issue")}
            onPress={onSubmit}
            loading={submitting}
            disabled={submitting || parsedAmount <= 0 || !chequeDetailsValid(method, cheque)}
            style={{ flex: 1 }}
          />
        </Footer>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-3 pb-6">
            <FieldLabel className="mb-0">{t("nav.customers")}</FieldLabel>
            <Card className="p-3.5">
              <View className="flex-row items-center gap-3">
                <Photo kind={photoKindForCustomerType(customer.type)} size={48} />
                <View className="min-w-0 flex-1">
                  <Text className="text-navy-900 text-[15px] font-tajawal-extrabold" numberOfLines={1}>
                    {customer.full_name}
                  </Text>
                  <Text className="text-ink-500 mt-0.5 text-[12px] font-tajawal">
                    {t(`customerType.${customer.type}`, { defaultValue: customer.type })}
                  </Text>
                </View>
              </View>
              {ledger ? (
                <>
                  <Divider dashed />
                  <View className="flex-row items-center justify-between">
                    <Text className="text-ink-500 text-[13px] font-tajawal">
                      {t("billing.voucher.currentBalance")}
                    </Text>
                    {balance > 0 ? (
                      <Text className="text-rose text-[14px] font-tajawal-bold">
                        {t("visits.wizard.debt", { amount: formatAmount(balance) })}
                      </Text>
                    ) : (
                      <Money value={balance} />
                    )}
                  </View>
                </>
              ) : null}
            </Card>

            <FieldLabel className="mb-0 mt-1.5">{t("billing.voucher.amountLabel")}</FieldLabel>
            <AmountEntry
              value={amountText}
              onChangeText={setAmountText}
              presets={["100", "250", "500", "1000", t("billing.voucher.remaining")]}
              onPreset={(label) => {
                if (label === t("billing.voucher.remaining")) {
                  setAmountText(balance > 0 ? String(balance) : "");
                } else {
                  setAmountText(label);
                }
              }}
            />

            <FieldLabel className="mb-0 mt-1.5">{t("billing.voucher.methodTitle")}</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {VOUCHER_METHODS.map((m) => (
                <Chip
                  key={m}
                  label={t(`paymentMethod.${m}`)}
                  active={method === m ? "navy" : "off"}
                  onPress={() => {
                    setMethod(m);
                    if (m !== "cheque") setCheque(EMPTY_CHEQUE);
                  }}
                />
              ))}
            </View>
            {method === "cheque" ? <ChequeFields value={cheque} onChange={setCheque} /> : null}

            <FieldLabel className="mb-0 mt-1.5">{t("billing.voucher.notesLabel")}</FieldLabel>
            <Input
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: "top" }}
            />

            <Card flat className="bg-teal-50 border-teal-100 mt-1.5 p-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-teal-700 text-[13px] font-tajawal-bold">
                  {t("billing.voucher.balanceAfter")}
                </Text>
                <Money value={balanceAfter} className="text-teal-700" />
              </View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
