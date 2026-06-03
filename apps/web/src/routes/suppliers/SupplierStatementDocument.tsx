import { formatCurrency, formatDate, type SupplierLedgerEntryResponse } from "@vet/shared";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

export interface SupplierStatementDocumentProps {
  supplierName: string;
  supplierPhone?: string | null;
  periodLabel: string;
  entries: SupplierLedgerEntryResponse[];
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
}

/**
 * Printable supplier account statement (A4) — the AP mirror of the customer StatementDocument.
 * Rendered off-screen; `react-to-print` clones it into a print iframe (copying the app's stylesheets).
 * RTL Arabic. `debit` = a purchase invoice (increases the payable), `credit` = a payment.
 */
export const SupplierStatementDocument = forwardRef<HTMLDivElement, SupplierStatementDocumentProps>(
  function SupplierStatementDocument(
    { supplierName, supplierPhone, periodLabel, entries, openingBalance, closingBalance, totalDebit, totalCredit },
    ref,
  ) {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const refOf = (e: SupplierLedgerEntryResponse) => {
      const id = e.purchaseInvoiceId ?? e.supplierPaymentId;
      return id ? `#${id.slice(0, 8)}` : "—";
    };

    return (
      <div ref={ref} dir="rtl" className="bg-white p-8 text-navy-900" style={{ width: "210mm", fontFamily: "Tajawal, sans-serif" }}>
        <div className="mb-6 flex items-start justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-extrabold">{t("appName")}</h1>
            <p className="text-sm text-muted-foreground">{t("shell.center")}</p>
          </div>
          <div className="text-end">
            <h2 className="text-lg font-bold">{t("suppliers.statement.reportTitle")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("suppliers.statement.generatedAt", { date: formatDate(new Date(), lang) })}
            </p>
          </div>
        </div>

        <div className="mb-4 flex justify-between text-sm">
          <div>
            <div className="font-bold">{supplierName}</div>
            {supplierPhone ? (
              <div className="text-muted-foreground" dir="ltr">
                {supplierPhone}
              </div>
            ) : null}
          </div>
          <div className="text-muted-foreground">{periodLabel}</div>
        </div>

        <table className="w-full border-collapse text-sm" style={{ direction: "rtl" }}>
          <thead>
            <tr className="border-y bg-[var(--paper-soft)] text-start">
              <th className="p-2 text-start font-semibold">{t("suppliers.statement.colDate")}</th>
              <th className="p-2 text-start font-semibold">{t("suppliers.statement.colRef")}</th>
              <th className="p-2 text-start font-semibold">{t("suppliers.statement.colType")}</th>
              <th className="p-2 text-start font-semibold">{t("suppliers.statement.colDescription")}</th>
              <th className="p-2 text-end font-semibold">{t("suppliers.statement.colDebit")}</th>
              <th className="p-2 text-end font-semibold">{t("suppliers.statement.colCredit")}</th>
              <th className="p-2 text-end font-semibold">{t("suppliers.statement.colBalance")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b text-muted-foreground">
              <td className="p-2" colSpan={6}>
                {t("suppliers.statement.opening")}
              </td>
              <td className="p-2 text-end font-medium" dir="ltr">
                {formatCurrency(openingBalance, lang)}
              </td>
            </tr>
            {entries.map((e) => (
              <tr key={e.id} className="border-b">
                <td className="p-2" dir="ltr">
                  {formatDate(e.createdAt, lang)}
                </td>
                <td className="p-2 font-mono text-xs" dir="ltr">
                  {refOf(e)}
                </td>
                <td className="p-2">
                  {t(`supplierLedgerEntryType.${e.entryType}`, { defaultValue: e.entryType })}
                </td>
                <td className="p-2">{e.description ?? "—"}</td>
                <td className="p-2 text-end" dir="ltr">
                  {e.amount > 0 ? formatCurrency(e.amount, lang) : "—"}
                </td>
                <td className="p-2 text-end" dir="ltr">
                  {e.amount < 0 ? formatCurrency(-e.amount, lang) : "—"}
                </td>
                <td className="p-2 text-end font-medium" dir="ltr">
                  {formatCurrency(e.balanceAfter, lang)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end gap-8 border-t pt-3 text-sm">
          <span>
            {t("suppliers.statement.totalDebit")}: <b dir="ltr">{formatCurrency(totalDebit, lang)}</b>
          </span>
          <span>
            {t("suppliers.statement.totalCredit")}: <b dir="ltr">{formatCurrency(totalCredit, lang)}</b>
          </span>
          <span className="font-bold">
            {t("suppliers.statement.closing")}: <b dir="ltr">{formatCurrency(closingBalance, lang)}</b>
          </span>
        </div>
      </div>
    );
  },
);
