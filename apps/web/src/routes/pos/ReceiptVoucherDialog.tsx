import { formatCurrency, type PaymentMethod } from "@vet/shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCustomer, useCustomers } from "@/queries/customers";
import { useIssueReceiptVoucher, useReceiptVoucher } from "@/queries/receiptVouchers";

import { VoucherDocument } from "./VoucherDocument";

const METHODS: PaymentMethod[] = ["cash", "card", "bank_transfer"];

/**
 * Issue a receipt voucher (Sanad Qabd) — a payment received from a customer that posts a credit to
 * their ledger. Pick a customer (or launch pre-set from a customer screen), enter amount + method,
 * then issue and print the 80mm voucher. Issuance returns only {id}, so the doc refetches it.
 */
export function ReceiptVoucherDialog({
  open,
  onClose,
  presetCustomerId,
}: {
  open: boolean;
  onClose: () => void;
  presetCustomerId?: string | null;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [customerId, setCustomerId] = useState<string | null>(presetCustomerId ?? null);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [issuedId, setIssuedId] = useState<string | null>(null);

  // Reset to a clean form each time the dialog (re)opens.
  useEffect(() => {
    if (!open) return;
    setCustomerId(presetCustomerId ?? null);
    setSearch("");
    setAmount("");
    setMethod("cash");
    setNotes("");
    setIssuedId(null);
  }, [open, presetCustomerId]);

  const candidates = useCustomers({ search: debounced || undefined, take: 20 });
  const picked = useCustomer(customerId);
  const issue = useIssueReceiptVoucher();
  const issuedVoucher = useReceiptVoucher(issuedId);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: t("pos.voucher.receiptTitle"),
    pageStyle: "@page { size: 80mm auto; margin: 3mm; }",
  });

  const amountNum = Number(amount) || 0;
  const canSubmit = customerId !== null && amountNum > 0 && !issue.isPending;

  const onSubmit = () => {
    if (customerId === null || amountNum <= 0) return;
    issue.mutate(
      { customerId, amount: amountNum, method, notes: notes.trim() || undefined },
      {
        onSuccess: (res) => {
          setIssuedId(res.id);
          toast.success(t("pos.voucher.success"));
        },
        onError: (e) => toast.error(e.message),
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
              {formatCurrency(amountNum, lang)}
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
      ) : customerId === null ? (
        <div className="space-y-2">
          <Input
            autoFocus
            placeholder={t("pos.link.searchCustomer")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-72 divide-y overflow-auto rounded-xl border">
            {(candidates.data ?? []).length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">{t("customers.empty")}</div>
            ) : (
              (candidates.data ?? []).map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCustomerId(c.id)}
                  className="flex w-full items-center justify-between gap-2 p-3 text-start text-sm transition-colors hover:bg-muted"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{c.fullName}</span>
                    {c.phonePrimary ? (
                      <span className="ms-2 text-xs text-muted-foreground" dir="ltr">
                        {c.phonePrimary}
                      </span>
                    ) : null}
                  </span>
                  {c.balance > 0 ? (
                    <Badge variant="warning" className="tabular-nums">
                      {formatCurrency(c.balance, lang)}
                    </Badge>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border bg-ink-50/60 p-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{t("pos.voucher.customer")}</div>
              <div className="truncate font-semibold text-navy-900">{picked.data?.fullName ?? "…"}</div>
              {picked.data && picked.data.balance > 0 ? (
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(picked.data.balance, lang)}
                </div>
              ) : null}
            </div>
            {!presetCustomerId ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setCustomerId(null)}>
                {t("pos.link.change")}
              </Button>
            ) : null}
          </div>

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
