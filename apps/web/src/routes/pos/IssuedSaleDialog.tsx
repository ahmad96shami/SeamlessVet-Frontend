import { formatCurrency } from "@vet/shared";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";
import { Money } from "@/components/ui/money";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useCustomer } from "@/queries/customers";
import { useInvoice } from "@/queries/invoices";
import { useSystemSettings } from "@/queries/systemSettings";

import { ReceiptDocument } from "./ReceiptDocument";

/**
 * Shown after a successful issuance: the authoritative invoice (refetched by id — issuance returns
 * only `{id}`), with an 80mm receipt print and a "new sale" reset. The receipt reflects the server's
 * totals (incl. any auto-assembled visit charges + tax), not the cleared cart.
 */
export function IssuedSaleDialog({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const invoice = useInvoice(invoiceId);
  const customer = useCustomer(invoice.data?.customerId ?? null);
  const settings = useSystemSettings();

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${t("pos.receipt.title")} - ${invoice.data?.number ?? invoiceId.slice(0, 8)}`,
    pageStyle: "@page { size: 80mm auto; margin: 3mm; }",
  });

  return (
    <Dialog open onClose={onClose} title={t("pos.issue.success")} className="max-w-md">
      {!invoice.data ? (
        <div className="py-8 text-center">
          <Icon.spinner className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border bg-ink-50/60 p-4 text-center">
            <div className="text-xs text-muted-foreground">{t("pos.receipt.invoiceNo")}</div>
            <div className="text-lg font-bold" dir="ltr">
              {invoice.data.number ?? `#${invoice.data.id.slice(0, 8)}`}
            </div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-navy-900">
              <Money value={invoice.data.total} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => handlePrint()}>
              <Icon.print className="size-4" />
              {t("pos.issue.printReceipt")}
            </Button>
            <Button type="button" className="flex-1" onClick={onClose}>
              {t("pos.issue.newSale")}
            </Button>
          </div>
        </div>
      )}

      <div style={{ position: "absolute", left: "-9999px", top: 0 }} aria-hidden>
        {invoice.data ? (
          <ReceiptDocument
            ref={printRef}
            invoice={invoice.data}
            customerName={customer.data?.fullName ?? null}
            taxDetails={settings.data?.invoiceTaxDetails ?? null}
          />
        ) : null}
      </div>
    </Dialog>
  );
}
