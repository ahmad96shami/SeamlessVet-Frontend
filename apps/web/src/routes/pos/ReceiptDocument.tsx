import { formatCurrency, formatDateTime, formatQuantity, type InvoiceResponse } from "@vet/shared";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

export interface ReceiptDocumentProps {
  invoice: InvoiceResponse;
  customerName: string | null;
  taxDetails?: string | null;
}

function Divider() {
  return <div className="my-1 border-t border-dashed border-black/40" />;
}

/**
 * 80mm thermal sales receipt (PRD §5.4). Rendered off-screen; `react-to-print` clones it into a
 * print iframe at 80mm. Self-contained, RTL Arabic. Built from the issued invoice — line names come
 * from the server-set `description`, so no catalog join. Reused for the void-row reprint (W6.7).
 */
export const ReceiptDocument = forwardRef<HTMLDivElement, ReceiptDocumentProps>(
  function ReceiptDocument({ invoice, customerName, taxDetails }, ref) {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;

    const nonCreditPaid = invoice.payments.reduce(
      (sum, p) => (p.method === "credit" ? sum : sum + p.amount),
      0,
    );
    const balance = Math.round((invoice.total - nonCreditPaid) * 100) / 100;
    const isVoid = invoice.status === "void";
    const number = invoice.number ?? `#${invoice.id.slice(0, 8)}`;
    const row = "flex justify-between gap-2";

    return (
      <div
        ref={ref}
        dir="rtl"
        className="bg-white text-black"
        style={{ width: "80mm", padding: "4mm", fontFamily: "Tajawal, sans-serif", fontSize: 12, lineHeight: 1.5 }}
      >
        <div className="text-center">
          <div className="text-base font-extrabold">{t("appName")}</div>
          <div className="text-[10px]">{t("shell.center")}</div>
          {taxDetails ? <div className="whitespace-pre-wrap text-[10px]">{taxDetails}</div> : null}
        </div>

        {isVoid ? (
          <div className="my-1 text-center text-sm font-bold text-destructive">{t("pos.receipt.void")}</div>
        ) : null}

        <Divider />
        <div className={row}>
          <span>{t("pos.receipt.invoiceNo")}</span>
          <span dir="ltr">{number}</span>
        </div>
        <div className={row}>
          <span>{t("pos.receipt.date")}</span>
          <span dir="ltr">{formatDateTime(invoice.issuedAt, lang)}</span>
        </div>
        <div className={row}>
          <span>{t("pos.receipt.customer")}</span>
          <span dir="auto">{customerName ?? t("pos.receipt.walkIn")}</span>
        </div>

        <Divider />
        {invoice.items.map((it) => (
          <div key={it.id} className="mb-1">
            <div className="font-medium">{it.description ?? "—"}</div>
            <div className={row}>
              <span dir="ltr" className="tabular-nums">
                {formatQuantity(it.quantity, lang)} × {formatCurrency(it.unitPrice, lang)}
                {it.discountAmount > 0 ? ` − ${formatCurrency(it.discountAmount, lang)}` : ""}
              </span>
              <span className="tabular-nums">{formatCurrency(it.lineTotal, lang)}</span>
            </div>
          </div>
        ))}

        <Divider />
        <div className={row}>
          <span>{t("pos.receipt.subtotal")}</span>
          <span className="tabular-nums">{formatCurrency(invoice.subtotal, lang)}</span>
        </div>
        {invoice.discountAmount !== 0 ? (
          <div className={row}>
            <span>{t("pos.receipt.discount")}</span>
            <span className="tabular-nums">{formatCurrency(invoice.discountAmount, lang)}</span>
          </div>
        ) : null}
        {invoice.taxAmount !== 0 ? (
          <div className={row}>
            <span>{t("pos.receipt.tax")}</span>
            <span className="tabular-nums">{formatCurrency(invoice.taxAmount, lang)}</span>
          </div>
        ) : null}
        <div className={`${row} mt-1 border-t pt-1 text-sm font-bold`}>
          <span>{t("pos.receipt.total")}</span>
          <span className="tabular-nums">{formatCurrency(invoice.total, lang)}</span>
        </div>

        <Divider />
        {invoice.payments.map((p) => (
          <div key={p.id} className={row}>
            <span>{t(`paymentMethod.${p.method}`, { defaultValue: p.method })}</span>
            <span className="tabular-nums">{formatCurrency(p.amount, lang)}</span>
          </div>
        ))}
        {balance > 0 ? (
          <div className={`${row} font-semibold`}>
            <span>{t("pos.receipt.balanceDue")}</span>
            <span className="tabular-nums">{formatCurrency(balance, lang)}</span>
          </div>
        ) : null}

        <Divider />
        <div className="text-center text-[11px]">{t("pos.receipt.thankYou")}</div>
      </div>
    );
  },
);
