import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { buildFieldInvoiceRequest, PAYMENT_METHOD_VALUES, type PaymentMethod } from "@vet/shared";

import { Button, Card, Chip, Money, Pill, SkeletonList } from "@/components/ui";
import {
  ChequeFields,
  chequeDetailsValid,
  chequeRequestFields,
  EMPTY_CHEQUE,
  type ChequeDetails,
} from "@/components/ChequeFields";
import { Footer, ScreenShell, TopBar } from "@/components/layout";
import { sendOrQueue } from "@/services/sendOrQueue";
import { dialog } from "@/stores/dialogStore";
import { checkFieldStockAvailability, type FieldStockGuardResult } from "@/sync/fieldInventory";
import { powerSync } from "@/sync/database";
import { useQuery } from "@/sync/hooks";
import type {
  CustomerRow,
  PetRow,
  ProcedureRow,
  PrescriptionRow,
  ProductRow,
  ServiceRow,
  VisitRow,
} from "@/sync/types";
import {
  applyDiscount,
  buildFieldBillingPreview,
  stockGuardLines,
} from "@/sync/visitBilling";

const PAYMENT_OPTIONS = PAYMENT_METHOD_VALUES;

/**
 * Mo4.2 — field-invoice issuance. Renders a preview of what the server will auto-assemble
 * (unbilled dispensed-to-owner prescriptions + procedures), runs the Mo3.3 negative-stock
 * guard against the doctor's field inventory, and POSTs `{items: [], payments: [...]}`
 * through `sendOrQueue` so a tap when offline parks the intent and replays on reconnect.
 *
 * Per the M7 service: contract pricing is applied server-side when the visit's contract is
 * `active`; otherwise catalog. The preview shows catalog estimates only — never the final
 * total — so an active-contract discount surprising the doctor is just an under-estimate,
 * never an over-bill. The screen makes that clear via a "تقديري" (estimated) label.
 */
export default function FieldInvoiceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: visitId } = useLocalSearchParams<{ id: string }>();
  const id = visitId ?? "";

  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cheque, setCheque] = useState<ChequeDetails>(EMPTY_CHEQUE);
  const [submitting, setSubmitting] = useState(false);
  const [guard, setGuard] = useState<FieldStockGuardResult | null>(null);

  const { data: visits } = useQuery<VisitRow>(`SELECT * FROM visits WHERE id = ?`, [id]);
  const visit = visits?.[0];

  const { data: customers } = useQuery<CustomerRow>(
    `SELECT * FROM customers WHERE id = ?`,
    [visit?.customer_id ?? ""],
  );
  const customer = customers?.[0];

  const { data: pets } = useQuery<PetRow>(`SELECT * FROM pets WHERE id = ?`, [visit?.pet_id ?? ""]);
  const pet = pets?.[0];

  const { data: prescriptions } = useQuery<PrescriptionRow>(
    `SELECT * FROM prescriptions WHERE visit_id = ? ORDER BY created_at`,
    [id],
  );
  const { data: procedures } = useQuery<ProcedureRow>(
    `SELECT * FROM procedures WHERE visit_id = ? ORDER BY created_at`,
    [id],
  );
  const { data: products } = useQuery<ProductRow>(`SELECT * FROM products`);
  const { data: services } = useQuery<ServiceRow>(`SELECT * FROM services`);

  const preview = useMemo(() => {
    if (!prescriptions || !procedures || !products || !services) {
      return null;
    }
    const productsById = new Map(products.map((p) => [p.id, p]));
    const servicesById = new Map(services.map((s) => [s.id, s]));
    return buildFieldBillingPreview(prescriptions, procedures, productsById, servicesById);
  }, [prescriptions, procedures, products, services]);

  const total = useMemo(() => (preview ? applyDiscount(preview.subtotal, 0) : 0), [preview]);

  // Run the Mo3.3 negative-stock guard whenever the preview rows change. Pure read; no
  // mutation, no enqueue — just the doctor-facing "you can't bill what you don't have"
  // hint, which the server would also reject as `negative_stock` on submit.
  useEffect(() => {
    if (!preview) {
      setGuard(null);
      return;
    }
    const lines = stockGuardLines(preview);
    if (lines.length === 0) {
      setGuard({ ok: true, shortages: [] });
      return;
    }
    let active = true;
    void checkFieldStockAvailability(powerSync, lines).then((result) => {
      if (active) setGuard(result);
    });
    return () => {
      active = false;
    };
  }, [preview]);

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

  const hasBillableLines = (preview?.prescriptions.length ?? 0) + (preview?.procedures.length ?? 0) > 0;
  const stockOk = guard?.ok !== false;
  const canSubmit = !submitting && hasBillableLines && stockOk && chequeDetailsValid(method, cheque);

  const onSubmit = async () => {
    if (!preview) return;
    setSubmitting(true);
    try {
      // items=[]: server auto-assembles unbilled dispensed_to_owner prescriptions + procedures
      // (M7 task 8). One payment leg at the displayed total — credit = on-account, every other
      // method = paid in full. Partial-payment splits stay deferred to web (W6 already supports
      // them; the field doctor's case is overwhelmingly all-cash or all-credit).
      const descriptor = buildFieldInvoiceRequest(id, {
        items: [],
        discountAmount: 0,
        payments: [{ method, amount: total, ...chequeRequestFields(method, cheque) }],
      });
      const result = await sendOrQueue(descriptor);
      void dialog.alert(
        t("billing.field.issuedTitle"),
        result.queued ? t("billing.field.queuedBody") : t("billing.field.issuedBody"),
        t("actions.close"),
      );
      router.back();
    } catch (err) {
      const message = (err as Error).message ?? "issuance failed";
      void dialog.alert(t("billing.field.failed"), message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell
      header={<TopBar title={t("billing.field.title")} onBack={() => router.back()} right={null} />}
      footer={
        <Footer>
          <View className="flex-1">
            <Text className="text-ink-500 text-[12px] font-tajawal">
              {t("billing.field.totalLabel")}
            </Text>
            <Money value={total} className="text-[16px]" />
          </View>
          <Button
            label={t("billing.field.issue")}
            onPress={onSubmit}
            loading={submitting}
            disabled={!canSubmit}
          />
        </Footer>
      }
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
                {visit.contract_id ? <Pill tone="teal" label={t("nav.contracts")} /> : null}
              </View>
            </Card>

            <Section title={t("billing.field.linesTitle")}>
              {!preview ? (
                <SkeletonList rows={3} avatar={false} />
              ) : !hasBillableLines ? (
                <Text className="text-ink-500 text-[13px] font-tajawal">
                  {t("billing.field.noLines")}
                </Text>
              ) : (
                <View className="gap-2">
                  {preview.prescriptions.map((line) => (
                    <LineRow
                      key={line.prescriptionId}
                      label={line.productName}
                      qty={line.quantity}
                      total={line.lineTotal}
                    />
                  ))}
                  {preview.procedures.map((line) => (
                    <LineRow
                      key={line.procedureId}
                      label={line.description}
                      qty={line.quantity}
                      total={line.lineTotal}
                    />
                  ))}
                </View>
              )}
            </Section>

            {guard && !guard.ok ? (
              <Card flat className="bg-amber-soft gap-1.5 p-3">
                <Text className="text-amber-ink text-[13px] font-tajawal-extrabold">
                  {t("billing.field.stockShortageTitle")}
                </Text>
                {guard.shortages.map((s) => (
                  <Text key={s.productId} className="text-amber-ink text-[12px] font-tajawal">
                    {t("billing.field.stockShortageRow", {
                      product: s.productName,
                      requested: s.requestedQty,
                      onHand: s.onHand,
                    })}
                  </Text>
                ))}
              </Card>
            ) : null}

            <Section title={t("billing.field.paymentTitle")}>
              <View className="flex-row flex-wrap gap-2">
                {PAYMENT_OPTIONS.map((m) => (
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

            <Card flat className="gap-1.5 p-3">
              <Row label={t("billing.field.estimateLabel")} dim>
                <Money value={preview?.subtotal ?? 0} dim />
              </Row>
              <Row label={t("billing.field.totalLabel")}>
                <Money value={total} />
              </Row>
            </Card>
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

function LineRow({ label, qty, total }: { label: string; qty: number; total: number }) {
  return (
    <View className="border-ink-200 flex-row items-center justify-between border-b border-dashed py-1.5">
      <View className="flex-1 pe-2">
        <Text className="text-navy-900 text-[14px] font-tajawal-bold" numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-ink-500 text-[12px] font-tajawal">×{qty}</Text>
      </View>
      <Money value={total} />
    </View>
  );
}

function Row({ label, dim, children }: { label: string; dim?: boolean; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text
        className={`${dim ? "text-ink-500" : "text-navy-900"} text-[13px] font-tajawal-bold`}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}
