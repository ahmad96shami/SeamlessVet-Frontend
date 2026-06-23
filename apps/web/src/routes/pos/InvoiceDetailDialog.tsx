import { formatCurrency, formatDateTime, formatQuantity, type InvoiceResponse } from "@vet/shared";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { Money } from "@/components/ui/money";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useVoidInvoice } from "@/queries/invoices";

import { invoiceStatusVariant } from "./invoiceStatus";
import { ReceiptDocument } from "./ReceiptDocument";

/**
 * View an invoice (items + payments + totals), reprint its 80mm receipt, and void it. Void is
 * append-only server-side (a reversing row + a compensating ledger entry; the original is untouched)
 * — confirmed inline (the backend takes no reason). Already-void rows + already-voided originals
 * can't be voided again.
 */
export function InvoiceDetailDialog({
  invoice,
  customerName,
  alreadyVoided,
  onClose,
}: {
  invoice: InvoiceResponse;
  customerName: string | null;
  alreadyVoided: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const voidMut = useVoidInvoice();
  const [confirmVoid, setConfirmVoid] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: t("pos.receipt.title"),
    pageStyle: "@page { size: 80mm auto; margin: 3mm; }",
  });

  const isVoidRow = invoice.status === "void" || invoice.voidOfInvoiceId != null;
  const canVoid = !isVoidRow && !alreadyVoided;
  const number = invoice.number ?? `#${invoice.id.slice(0, 8)}`;

  const doVoid = () =>
    voidMut.mutate(invoice.id, {
      onSuccess: () => {
        toast.success(t("pos.void.success"));
        onClose();
      },
    });

  return (
    <Dialog open onClose={onClose} title={`${t("pos.receipt.title")} ${number}`} className="max-w-md">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground" dir="ltr">
            {formatDateTime(invoice.issuedAt, lang)}
          </span>
          <Badge variant={invoiceStatusVariant(invoice.status)}>
            {t(`invoiceStatus.${invoice.status}`, { defaultValue: invoice.status })}
          </Badge>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">{t("pos.receipt.customer")}: </span>
          {customerName ?? t("pos.receipt.walkIn")}
        </div>

        <div className="divide-y rounded-xl border text-sm">
          {invoice.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2 p-2">
              <span className="min-w-0 truncate">
                {it.description ?? "—"}
                <span className="ms-1 text-xs text-muted-foreground tabular-nums">
                  × {formatQuantity(it.quantity, lang)}
                </span>
              </span>
              <span className="tabular-nums"><Money value={it.lineTotal} /></span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t pt-2 text-base font-bold text-navy-900">
          <span>{t("pos.receipt.total")}</span>
          <span className="tabular-nums"><Money value={invoice.total} /></span>
        </div>

        {confirmVoid ? (
          <div className="space-y-2 rounded-xl border border-destructive/40 bg-red-soft/30 p-3">
            <p className="text-sm">{t("pos.void.body")}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setConfirmVoid(false)}
                disabled={voidMut.isPending}
              >
                {t("admin.common.cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={doVoid}
                disabled={voidMut.isPending}
              >
                {t("pos.void.confirm")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => handlePrint()}>
              <Icon.print className="size-4" />
              {t("pos.invoices.reprint")}
            </Button>
            {canVoid ? (
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={() => setConfirmVoid(true)}
              >
                <Icon.trash className="size-4" />
                {t("pos.void.action")}
              </Button>
            ) : null}
          </div>
        )}
      </div>

      <div style={{ position: "absolute", left: "-9999px", top: 0 }} aria-hidden>
        <ReceiptDocument ref={printRef} invoice={invoice} customerName={customerName} />
      </div>
    </Dialog>
  );
}
