import { IMMEDIATE_PAYMENT_METHODS, type PaymentMethod } from "@vet/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { Money } from "@/components/ui/money";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCustomer } from "@/queries/customers";
import { useIssueReceiptVoucher, useReceiptVoucher } from "@/queries/receiptVouchers";
import { CustomerCombobox } from "@/routes/customers/CustomerCombobox";

import { VoucherDocument } from "./VoucherDocument";

// A voucher is money actually received, so only the immediate methods (incl. cheque — M19).
const METHODS = IMMEDIATE_PAYMENT_METHODS;

/**
 * Issue a receipt voucher (Sanad Qabd) — a payment received from a customer that posts a credit to
 * their ledger. Pick a customer (or launch pre-set from a customer screen), enter amount + method,
 * then issue and print the 80mm voucher. Issuance returns only {id}, so the doc refetches it.
 */
export function ReceiptVoucherDialog({
  open,
  onClose,
  presetCustomerId,
  presetFarmId,
}: {
  open: boolean;
  onClose: () => void;
  presetCustomerId?: string | null;
  /** M24 — lock the credit onto one farm ledger (the farm page's collect button). */
  presetFarmId?: string | null;
}) {
  const { t } = useTranslation();

  const [customerId, setCustomerId] = useState<string | null>(presetCustomerId ?? null);
  // Which ledger the credit posts to: null = the customer's own (non-farm) ledger, else a farm id.
  // M16 split a customer into own + per-farm ledgers, so a payment must name its target ledger —
  // otherwise it lands on the own ledger, which may be closed while a farm ledger is still open.
  const [targetFarmId, setTargetFarmId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeBank, setChequeBank] = useState("");
  const [chequeDueDate, setChequeDueDate] = useState("");
  const [issuedId, setIssuedId] = useState<string | null>(null);

  // Reset to a clean form each time the dialog (re)opens.
  useEffect(() => {
    if (!open) return;
    setCustomerId(presetCustomerId ?? null);
    setTargetFarmId(presetFarmId ?? null);
    setAmount("");
    setMethod("cash");
    setNotes("");
    setChequeNumber("");
    setChequeBank("");
    setChequeDueDate("");
    setIssuedId(null);
  }, [open, presetCustomerId, presetFarmId]);

  const picked = useCustomer(customerId);
  const issue = useIssueReceiptVoucher();
  const issuedVoucher = useReceiptVoucher(issuedId);

  // The customer's postable ledgers: own account + each farm. A closed ledger can't take a credit,
  // so it's shown but disabled. The picker only appears once a customer has farm ledgers.
  const targets = useMemo(() => {
    const c = picked.data;
    if (!c) return [] as { farmId: string | null; label: string; balance: number; closed: boolean }[];
    return [
      {
        farmId: null,
        label: t("pos.voucher.ownAccount"),
        balance: c.ownBalance,
        closed: c.ownLedgerStatus === "closed",
      },
      ...(c.farmLedgers ?? []).map((fl) => ({
        farmId: fl.farmId,
        label: fl.farmName,
        balance: fl.balance,
        closed: fl.status === "closed",
      })),
    ];
  }, [picked.data, t]);

  const hasFarms = (picked.data?.farmLedgers?.length ?? 0) > 0;
  const openTargets = targets.filter((tg) => !tg.closed);
  const allClosed = targets.length > 0 && openTargets.length === 0;
  const selectedTarget = targets.find((tg) => tg.farmId === targetFarmId) ?? null;

  // Default the target whenever a different customer loads: the open ledger carrying the most debt
  // (so the common "pay down the biggest balance" case is preselected), else the first open one.
  useEffect(() => {
    const c = picked.data;
    if (!c) {
      setTargetFarmId(null);
      return;
    }
    const opts = [
      { farmId: null as string | null, balance: c.ownBalance, closed: c.ownLedgerStatus === "closed" },
      ...(c.farmLedgers ?? []).map((fl) => ({
        farmId: fl.farmId as string | null,
        balance: fl.balance,
        closed: fl.status === "closed",
      })),
    ];
    // A preset farm (the farm page's collect button) wins over the highest-debt default.
    if (presetFarmId != null) {
      setTargetFarmId(presetFarmId);
      return;
    }
    const open = opts.filter((o) => !o.closed).sort((a, b) => b.balance - a.balance);
    setTargetFarmId(open[0]?.farmId ?? null);
    // Keyed on identity, not the query object, so a background refetch never overrides a manual pick.
  }, [picked.data?.id, presetFarmId]);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: t("pos.voucher.receiptTitle"),
    pageStyle: "@page { size: 80mm auto; margin: 3mm; }",
  });

  const amountNum = Number(amount) || 0;
  const canSubmit =
    customerId !== null &&
    amountNum > 0 &&
    !issue.isPending &&
    selectedTarget !== null &&
    !selectedTarget.closed;

  const onSubmit = () => {
    if (customerId === null || amountNum <= 0 || selectedTarget === null || selectedTarget.closed) return;
    const cheque =
      method === "cheque"
        ? {
            ...(chequeNumber.trim() ? { chequeNumber: chequeNumber.trim() } : {}),
            ...(chequeBank.trim() ? { chequeBank: chequeBank.trim() } : {}),
            ...(chequeDueDate ? { chequeDueDate } : {}),
          }
        : {};
    issue.mutate(
      {
        customerId,
        ...(targetFarmId ? { farmId: targetFarmId } : {}),
        amount: amountNum,
        method,
        notes: notes.trim() || undefined,
        ...cheque,
      },
      {
        onSuccess: (res) => {
          setIssuedId(res.id);
          toast.success(t("pos.voucher.success"));
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("pos.voucher.title")} description={t("pos.voucher.subtitle")}>
      {issuedId ? (
        <div className="space-y-4">
          <div className="rounded-xl border bg-ink-50/60 p-4 text-center">
            <div className="text-xs text-muted-foreground">{t("pos.voucher.voucherNo")}</div>
            <div className="text-lg font-bold" dir="ltr">{`#${issuedId.slice(0, 8)}`}</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-navy-900">
              <Money value={amountNum} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => handlePrint()}>
              <Icon.print className="size-4" />
              {t("pos.voucher.print")}
            </Button>
            <Button type="button" className="flex-1" onClick={onClose}>
              {t("appointments.close")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label={t("pos.voucher.customer")}>
            <CustomerCombobox
              value={picked.data ?? null}
              onChange={(c) => setCustomerId(c.id)}
              showBalance
              disabled={!!presetCustomerId}
            />
          </Field>

          {/* Per-farm ledger picker (M16): only when the customer actually has farm ledgers, so a
              plain customer's flow is unchanged. Closed ledgers stay listed but disabled. */}
          {hasFarms ? (
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t("pos.voucher.targetAccount")}</span>
              <Select
                value={targetFarmId ?? ""}
                onChange={(e) => setTargetFarmId(e.target.value || null)}
                disabled={presetFarmId != null}
              >
                {targets.map((tg) => (
                  <option key={tg.farmId ?? "own"} value={tg.farmId ?? ""} disabled={tg.closed}>
                    {tg.label}
                    {tg.closed ? ` ${t("pos.voucher.accountClosedSuffix")}` : ""}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}

          {allClosed ? (
            <p className="text-xs text-destructive">{t("pos.voucher.allClosed")}</p>
          ) : selectedTarget && selectedTarget.balance > 0 ? (
            <div className="text-xs text-muted-foreground tabular-nums">
              <Money value={selectedTarget.balance} />
            </div>
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("pos.voucher.amount")}</span>
            <Input
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("pos.voucher.method")}</span>
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`paymentMethod.${m}`)}
                </option>
              ))}
            </Select>
          </label>
          {method === "cheque" ? (
            <div className="grid gap-2 rounded-xl border bg-ink-50/60 p-3 sm:grid-cols-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted-foreground">{t("cheque.number")}</span>
                <Input
                  dir="ltr"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted-foreground">{t("cheque.bank")}</span>
                <Input value={chequeBank} onChange={(e) => setChequeBank(e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted-foreground">{t("cheque.dueDate")}</span>
                <DatePicker value={chequeDueDate} onChange={(e) => setChequeDueDate(e.target.value)} />
              </label>
            </div>
          ) : null}
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("pos.voucher.notes")}</span>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </label>

          <Button type="button" className="w-full" disabled={!canSubmit} onClick={onSubmit}>
            <Icon.shield className="size-4" />
            {issue.isPending ? t("pos.voucher.submitting") : t("pos.voucher.submit")}
          </Button>
        </div>
      )}

      <div style={{ position: "absolute", left: "-9999px", top: 0 }} aria-hidden>
        {issuedVoucher.data ? (
          <VoucherDocument ref={printRef} voucher={issuedVoucher.data} customerName={picked.data?.fullName ?? null} />
        ) : null}
      </div>
    </Dialog>
  );
}
