import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  buildExamFeeInvoiceRequest,
  buildFieldInvoiceRequest,
  formatDate,
  PAYMENT_METHOD_VALUES,
  type PaymentMethod,
  type RequestDescriptor,
} from "@vet/shared";

import {
  ChequeFields,
  chequeDetailsValid,
  chequeRequestFields,
  EMPTY_CHEQUE,
  type ChequeDetails,
} from "@/components/ChequeFields";
import { Box, Briefcase, Calendar, Stethoscope } from "@/components/icons";
import { Footer, ScreenShell, TopBar } from "@/components/layout";
import {
  Button,
  Card,
  Chip,
  Divider,
  IconTile,
  Money,
  OfflineBanner,
  Photo,
  photoKindForCustomerType,
  Pill,
} from "@/components/ui";
import { nextVisitNumber } from "@/lib/visitNumber";
import { offlineQueue } from "@/services/offlineQueue";
import { sendOrQueue } from "@/services/sendOrQueue";
import { notifyEnqueued } from "@/services/syncEngine";
import { useAuthStore } from "@/stores/authStore";
import { dialog } from "@/stores/dialogStore";
import { useVisitWizardStore } from "@/stores/visitWizardStore";
import { powerSync } from "@/sync/database";
import {
  checkFieldStockAvailability,
  FIELD_STOCK_SQL,
  type FieldStockLine,
  type FieldStockRow,
} from "@/sync/fieldInventory";
import { useQuery } from "@/sync/hooks";
import {
  findActiveContractIdForCustomer,
  getDefaultExamFee,
  listLocalVisitNumbers,
} from "@/sync/queries";
import { syncInsert } from "@/sync/writes";
import type { CustomerRow, ServiceRow } from "@/sync/types";
import { colors } from "@/theme";

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Wait for PowerSync's CRUD upload queue to drain so the server has the visit's
 * clinical rows (visit / prescriptions / procedures via /sync) BEFORE the invoice
 * endpoint tries to auto-assemble them. Without this barrier an online confirm
 * races the async upload and the server answers "nothing to bill" (MoD smoke).
 */
async function waitForClinicalUpload(timeoutMs = 12_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const stats = await powerSync.getUploadQueueStats(false);
      if (stats.count === 0) return true;
    } catch {
      /* stats unavailable — keep polling until the deadline */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

/**
 * Wizard review + confirm (MoD.5). Totals here are CATALOG/CONTRACT ESTIMATES —
 * the server auto-assembles and prices the invoice (`items: []`, M7 task 8).
 *
 * "حفظ كمسودة" runs the clinical writes only (visit + prescriptions +
 * procedures + optional vaccination) through `/sync` — exactly the rows the old
 * à-la-carte flow produced — and stops before any invoice.
 *
 * "تأكيد وتسجيل الزيارة" additionally issues the field invoice (and the
 * exam-fee invoice when toggled) through `sendOrQueue`, after the Mo3.3
 * negative-stock guard. Business 4xx conflicts (negative_stock,
 * settlement_locked) re-throw — surfaced, never silently parked.
 */
export default function WizardReviewScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const wizard = useVisitWizardStore();

  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cheque, setCheque] = useState<ChequeDetails>(EMPTY_CHEQUE);
  const [submitting, setSubmitting] = useState<"draft" | "confirm" | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);
  const [defaultFee, setDefaultFee] = useState<number | null>(null);

  useEffect(() => {
    void getDefaultExamFee().then(setDefaultFee);
  }, []);
  useEffect(() => {
    let active = true;
    if (!wizard.customerId) return;
    void findActiveContractIdForCustomer(wizard.customerId, wizard.farmId).then((id) => {
      if (active) setContractId(id);
    });
    return () => {
      active = false;
    };
  }, [wizard.customerId, wizard.farmId]);

  const { data: customers = [] } = useQuery<CustomerRow>(
    `SELECT * FROM customers WHERE id = ?`,
    [wizard.customerId ?? ""],
  );
  const customer = customers[0];

  const { data: stockRows = [] } = useQuery<FieldStockRow>(FIELD_STOCK_SQL);
  const { data: catalog = [] } = useQuery<ServiceRow>(`SELECT * FROM services`);
  const { data: overrides = [] } = useQuery<{ product_id: string; contract_price: number | null }>(
    `SELECT product_id, contract_price FROM contract_medication_prices WHERE contract_id = ?`,
    [contractId ?? ""],
  );

  // -- Estimate lines (contract-override aware; server stays authoritative) ----
  const medLines = useMemo(() => {
    const overrideByProduct = new Map(overrides.map((o) => [o.product_id, o.contract_price]));
    const byProduct = new Map(stockRows.map((r) => [r.product_id, r]));
    return Object.entries(wizard.cart).map(([productId, qty]) => {
      const row = byProduct.get(productId);
      const price = overrideByProduct.get(productId) ?? row?.selling_price ?? 0;
      return {
        productId,
        name: row?.name_ar ?? row?.name_latin ?? "—",
        unit: row?.unit_of_measure ?? null,
        qty,
        lineTotal: round2(qty * price),
      };
    });
  }, [wizard.cart, stockRows, overrides]);

  const serviceLines = useMemo(
    () =>
      catalog
        .filter((s) => wizard.services[s.id])
        .map((s) => ({ serviceId: s.id, name: s.name_ar, price: s.default_price ?? 0 })),
    [catalog, wizard.services],
  );

  // Mo11 — under a batch (Dawra), the كشفية is covered by the supervision fee (server enforces
  // `exam_fee_covered_by_batch`); a standalone visit keeps it. The services step already forces the
  // toggle off under a batch, but gate here too so the estimate + issuance never include it.
  const examFeeOn = wizard.examFeeEnabled && !wizard.batchId;
  const examFee = examFeeOn ? (wizard.examFee ?? defaultFee ?? 0) : 0;
  const medsTotal = round2(medLines.reduce((sum, l) => sum + l.lineTotal, 0));
  const servicesTotal = round2(serviceLines.reduce((sum, l) => sum + l.price, 0));
  const fieldTotal = round2(medsTotal + servicesTotal);
  const grandTotal = round2(fieldTotal + examFee);

  const hasAnyLine = medLines.length > 0 || serviceLines.length > 0;
  const canSubmit =
    !submitting && !!customer && !!user?.userId && chequeDetailsValid(method, cheque);

  /** Clinical writes shared by draft + confirm — mirrors the old new.tsx field set. */
  const persistClinical = async (): Promise<{ visitId: string; visitNumber: string | null }> => {
    const [cId, prior] = await Promise.all([
      findActiveContractIdForCustomer(customer!.id, wizard.farmId),
      listLocalVisitNumbers(user!.userId),
    ]);
    // Mo11 — the batch is the doctor's explicit pick from step 1 (defaulting to the open batch),
    // not a silent auto-link; under a batch the visit carries no كشفية.
    const batchId = wizard.batchId;
    const visitNumber = nextVisitNumber(user!.numberPrefix, prior);
    const visitId = await syncInsert("visits", {
      visit_type: "field",
      visit_number: visitNumber,
      customer_id: customer!.id,
      farm_id: wizard.farmId,
      pet_id: wizard.petId,
      doctor_id: user!.userId,
      contract_id: cId,
      batch_id: batchId,
      status: "open",
      started_at: new Date().toISOString(),
      chief_complaint: wizard.notes.trim() || null,
      exam_fee_applied: examFeeOn ? (wizard.examFee ?? defaultFee) : null,
    });
    for (const line of medLines) {
      await syncInsert("prescriptions", {
        visit_id: visitId,
        product_id: line.productId,
        dispense_type: "dispensed_to_owner",
        quantity: line.qty,
        dosage: null,
        frequency: null,
        duration: null,
        notes: null,
        reminder_enabled: 0,
      });
    }
    for (const svc of serviceLines) {
      await syncInsert("procedures", {
        visit_id: visitId,
        service_id: svc.serviceId,
        price: svc.price,
        result_text: null,
        result_file_url: null,
      });
    }
    const dose = wizard.nextDose;
    if (dose && dose.vaccineType.trim() && /^\d{4}-\d{2}-\d{2}$/.test(dose.dueDate.trim())) {
      await syncInsert("vaccinations", {
        visit_id: visitId,
        customer_id: customer!.id,
        pet_id: wizard.petId,
        vaccine_type: dose.vaccineType.trim(),
        date_given: new Date().toISOString().slice(0, 10),
        next_due_date: dose.dueDate.trim(),
        certificate_url: null,
      });
    }
    return { visitId, visitNumber };
  };

  const onDraft = async () => {
    if (!canSubmit) return;
    setSubmitting("draft");
    try {
      const { visitId } = await persistClinical();
      wizard.reset();
      void dialog.alert(t("visits.wizard.saveDraft"), t("visits.wizard.draftSaved"));
      router.replace({ pathname: "/visits/[id]", params: { id: visitId } });
    } catch (err) {
      void dialog.alert(t("visits.wizard.saveDraft"), (err as Error).message ?? "save failed");
    } finally {
      setSubmitting(null);
    }
  };

  const onConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting("confirm");
    try {
      // Mo3.3 negative-stock guard BEFORE any write — billing what isn't in the
      // car fails server-side anyway; checking first keeps the visit row clean.
      const guardLines: FieldStockLine[] = medLines.map((l) => ({
        productId: l.productId,
        productName: l.name,
        requestedQty: l.qty,
      }));
      if (guardLines.length > 0) {
        const guard = await checkFieldStockAvailability(powerSync, guardLines);
        if (!guard.ok) {
          void dialog.alert(
            t("billing.field.stockShortageTitle"),
            guard.shortages
              .map((s) =>
                t("billing.field.stockShortageRow", {
                  product: s.productName,
                  requested: s.requestedQty,
                  onHand: s.onHand,
                }),
              )
              .join("\n"),
          );
          return;
        }
      }

      const { visitId, visitNumber } = await persistClinical();

      // The clinical rows ride PowerSync's ASYNC upload queue; the invoice must not
      // reach the server first. Online → wait for the queue to drain, then send
      // inline (conflicts surface immediately). Offline or slow → park the intent in
      // the REST queue: the sync engine replays it only after PowerSync's queue is
      // empty (Mo4's PowerSync-first ordering), preserving the same guarantee.
      const drained = powerSync.currentStatus.connected ? await waitForClinicalUpload() : false;
      const issue = async (descriptor: RequestDescriptor) => {
        if (drained) {
          await sendOrQueue(descriptor);
        } else {
          await offlineQueue.enqueue(descriptor);
          await notifyEnqueued();
        }
      };

      try {
        if (hasAnyLine) {
          // items=[] → the server auto-assembles unbilled dispensed_to_owner
          // prescriptions + procedures and applies contract pricing (M7 task 8).
          // One payment leg at the estimated total — exactly Mo4's field.tsx.
          await issue(
            buildFieldInvoiceRequest(visitId, {
              items: [],
              discountAmount: 0,
              payments: [{ method, amount: fieldTotal, ...chequeRequestFields(method, cheque) }],
            }),
          );
        }
        if (examFeeOn) {
          // amount undefined → server falls back to the visit's applied fee.
          await issue(
            buildExamFeeInvoiceRequest(visitId, {
              amount: wizard.examFee ?? undefined,
              payments: [{ method, amount: examFee, ...chequeRequestFields(method, cheque) }],
            }),
          );
        }
      } catch (err) {
        // Business 4xx (negative_stock / settlement_locked) — the visit + clinical
        // rows are saved; billing can be retried from the visit detail screen.
        void dialog.alert(t("billing.field.failed"), (err as Error).message ?? "issuance failed");
        wizard.reset();
        router.replace({ pathname: "/visits/[id]", params: { id: visitId } });
        return;
      }

      wizard.setResult({
        visitId,
        customerId: customer!.id,
        customerName: customer!.full_name,
        visitNumber,
        total: grandTotal,
      });
      router.replace("/visits/new/done" as never);
    } catch (err) {
      void dialog.alert(t("visits.wizard.confirm"), (err as Error).message ?? "save failed");
    } finally {
      setSubmitting(null);
    }
  };

  const now = new Date();
  const timeLabel = `${formatDate(now.toISOString(), i18n.resolvedLanguage)} · ${String(
    now.getHours(),
  ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <ScreenShell
      staticBody
      header={
        <TopBar title={t("visits.wizard.reviewTitle")} onBack={() => router.back()} right={null} />
      }
      footer={
        <Footer>
          <Button
            label={t("visits.wizard.saveDraft")}
            variant="soft"
            onPress={onDraft}
            loading={submitting === "draft"}
            disabled={!canSubmit}
            style={{ flex: 1 }}
          />
          <Button
            label={t("visits.wizard.confirm")}
            onPress={onConfirm}
            loading={submitting === "confirm"}
            disabled={!canSubmit}
            style={{ flex: 1.4 }}
          />
        </Footer>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-3.5 pb-6">
            {/* Client */}
            <Card className="flex-row items-center gap-3 p-3.5">
              <Photo kind={photoKindForCustomerType(customer?.type)} size={56} />
              <View className="min-w-0 flex-1">
                <Text className="text-navy-900 text-[16px] font-tajawal-extrabold" numberOfLines={1}>
                  {customer?.full_name ?? "—"}
                </Text>
                <Text className="text-ink-500 mt-0.5 text-[13px] font-tajawal">
                  {customer ? t(`customerType.${customer.type}`, { defaultValue: customer.type }) : ""}
                </Text>
                {contractId || wizard.batchId ? (
                  <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                    {contractId ? (
                      <Pill
                        tone="teal"
                        compact
                        leadingIcon={<Briefcase size={12} color={colors.teal[700]} />}
                        label={`${t("nav.contracts")} · ${t("contractStatus.active")}`}
                      />
                    ) : null}
                    {wizard.batchId ? (
                      <Pill
                        tone="navy"
                        compact
                        leadingIcon={<Box size={12} color={colors.white} />}
                        label={t("visits.wizard.underBatch")}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            </Card>

            {/* Time + reason */}
            <InfoRow icon={<Calendar size={18} color={colors.teal[600]} />} title={t("visits.wizard.appointment")} value={timeLabel} />
            <InfoRow
              icon={<Stethoscope size={18} color={colors.teal[600]} />}
              title={t("visits.wizard.reason")}
              value={wizard.notes.trim() || "—"}
            />

            {/* Meds */}
            {medLines.length > 0 ? (
              <Card className="p-3.5">
                <SectionHead
                  title={t("visits.wizard.dispensedMeds")}
                  onEdit={() => router.navigate("/visits/new/meds" as never)}
                  editLabel={t("actions.edit")}
                />
                {medLines.map((l, i) => (
                  <View key={l.productId}>
                    {i > 0 ? <Divider dashed /> : null}
                    <LineItem
                      name={l.name}
                      qty={`${l.qty} × ${l.unit ?? "—"}`}
                      total={l.lineTotal}
                    />
                  </View>
                ))}
              </Card>
            ) : null}

            {/* Services + exam fee */}
            {serviceLines.length > 0 || examFeeOn ? (
              <Card className="p-3.5">
                <SectionHead
                  title={t("visits.wizard.servicesAndExam")}
                  onEdit={() => router.navigate("/visits/new/services" as never)}
                  editLabel={t("actions.edit")}
                />
                {examFeeOn ? (
                  <LineItem
                    name={t("visits.wizard.fieldExamFee")}
                    qty={t("invoiceType.exam_fee")}
                    total={examFee}
                  />
                ) : null}
                {serviceLines.map((l, i) => (
                  <View key={l.serviceId}>
                    {i > 0 || examFeeOn ? <Divider dashed /> : null}
                    <LineItem name={l.name} qty="" total={l.price} />
                  </View>
                ))}
              </Card>
            ) : null}

            {/* Totals */}
            <Card className="gap-2 p-3.5">
              <TotalRow label={t("visits.wizard.medsTotal")}>
                <Money value={medsTotal} dim />
              </TotalRow>
              <TotalRow label={t("visits.wizard.servicesTotal")}>
                <Money value={round2(servicesTotal + examFee)} dim />
              </TotalRow>
              <Divider dashed />
              <TotalRow label={t("visits.wizard.estimatedTotal")} strong>
                <Money value={grandTotal} className="text-[18px]" />
              </TotalRow>
              <Text className="text-ink-500 text-[12px] font-tajawal">
                {t("visits.wizard.estimateNote")}
              </Text>
            </Card>

            {/* Payment */}
            <Card className="gap-3 p-3.5">
              <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">
                {t("billing.field.paymentTitle")}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {PAYMENT_METHOD_VALUES.map((m) => (
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
            </Card>

            <OfflineBanner message={t("visits.wizard.offlineNote")} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function InfoRow({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <Card className="flex-row items-center gap-3 p-3.5">
      <IconTile size="sm">{icon}</IconTile>
      <View className="min-w-0 flex-1">
        <Text className="text-ink-500 text-[12px] font-tajawal">{title}</Text>
        <Text className="text-navy-900 mt-0.5 text-[14px] font-tajawal-bold" numberOfLines={2}>
          {value}
        </Text>
      </View>
    </Card>
  );
}

function SectionHead({
  title,
  editLabel,
  onEdit,
}: {
  title: string;
  editLabel: string;
  onEdit: () => void;
}) {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">{title}</Text>
      <Text className="text-teal-600 text-[13px] font-tajawal-bold" onPress={onEdit}>
        {editLabel}
      </Text>
    </View>
  );
}

function LineItem({ name, qty, total }: { name: string; qty: string; total: number }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <View className="min-w-0 flex-1 pe-2">
        <Text className="text-navy-900 text-[14px] font-tajawal-bold" numberOfLines={1}>
          {name}
        </Text>
        {qty ? <Text className="text-ink-500 mt-0.5 text-[12px] font-tajawal">{qty}</Text> : null}
      </View>
      <Money value={total} />
    </View>
  );
}

function TotalRow({
  label,
  strong,
  children,
}: {
  label: string;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text
        className={
          strong
            ? "text-navy-900 text-[16px] font-tajawal-extrabold"
            : "text-ink-700 text-[14px] font-tajawal"
        }
      >
        {label}
      </Text>
      {children}
    </View>
  );
}
