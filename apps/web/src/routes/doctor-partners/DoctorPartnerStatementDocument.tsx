import { formatDate, type DoctorPartnerLedgerEntryResponse } from "@vet/shared";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import { Money } from "@/components/ui/money";
import { useCenterName } from "@/hooks/useCenterName";

export interface DoctorPartnerStatementDocumentProps {
  doctorName: string;
  periodLabel: string;
  entries: DoctorPartnerLedgerEntryResponse[];
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
}

/**
 * Printable doctor-partner account statement (A4) — the AP mirror of the supplier StatementDocument.
 * Rendered off-screen; `react-to-print` clones it into a print iframe (copying the app's stylesheets).
 * RTL Arabic. `debit` = an `entitlement` credit (increases the payable), `credit` = a payment.
 */
export const DoctorPartnerStatementDocument = forwardRef<
  HTMLDivElement,
  DoctorPartnerStatementDocumentProps
>(function DoctorPartnerStatementDocument(
  { doctorName, periodLabel, entries, openingBalance, closingBalance, totalDebit, totalCredit },
  ref,
) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const centerName = useCenterName();
  const refOf = (e: DoctorPartnerLedgerEntryResponse) => {
    const id = e.doctorEntitlementId ?? e.doctorPartnerPaymentId;
    return id ? `#${id.slice(0, 8)}` : "—";
  };

  return (
    <div ref={ref} dir="rtl" className="bg-white p-8 text-navy-900" style={{ width: "210mm", fontFamily: "Tajawal, sans-serif" }}>
      <div className="mb-6 flex items-start justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-extrabold" dir="auto">{centerName}</h1>
        </div>
        <div className="text-end">
          <h2 className="text-lg font-bold">{t("doctorPartners.statement.reportTitle")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("doctorPartners.statement.generatedAt", { date: formatDate(new Date(), lang) })}
          </p>
        </div>
      </div>

      <div className="mb-4 flex justify-between text-sm">
        <div className="font-bold">{doctorName}</div>
        <div className="text-muted-foreground">{periodLabel}</div>
      </div>

      <table className="w-full border-collapse text-sm" style={{ direction: "rtl" }}>
        <thead>
          <tr className="border-y bg-[var(--paper-soft)] text-start">
            <th className="p-2 text-start font-semibold">{t("doctorPartners.statement.colDate")}</th>
            <th className="p-2 text-start font-semibold">{t("doctorPartners.statement.colRef")}</th>
            <th className="p-2 text-start font-semibold">{t("doctorPartners.statement.colType")}</th>
            <th className="p-2 text-start font-semibold">{t("doctorPartners.statement.colDescription")}</th>
            <th className="p-2 text-end font-semibold">{t("doctorPartners.statement.colDebit")}</th>
            <th className="p-2 text-end font-semibold">{t("doctorPartners.statement.colCredit")}</th>
            <th className="p-2 text-end font-semibold">{t("doctorPartners.statement.colBalance")}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b text-muted-foreground">
            <td className="p-2" colSpan={6}>
              {t("doctorPartners.statement.opening")}
            </td>
            <td className="p-2 text-end font-medium">
              <Money value={openingBalance} />
            </td>
          </tr>
          {entries.map((e) => (
            <tr key={e.id} className="border-b">
              {/* dir="ltr" cells need text-end (= right inside LTR) to line up with the RTL
                  headers; amount cells stay RTL so text-end = the header's left edge. */}
              <td className="p-2 text-end" dir="ltr">
                {formatDate(e.createdAt, lang)}
              </td>
              <td className="p-2 text-end font-mono text-xs" dir="ltr">
                {refOf(e)}
              </td>
              <td className="p-2">
                {t(`doctorPartnerLedgerEntryType.${e.entryType}`, { defaultValue: e.entryType })}
              </td>
              <td className="p-2">{e.description ?? "—"}</td>
              <td className="p-2 text-end">{e.amount > 0 ? <Money value={e.amount} /> : "—"}</td>
              <td className="p-2 text-end">{e.amount < 0 ? <Money value={-e.amount} /> : "—"}</td>
              <td className="p-2 text-end font-medium">
                <Money value={e.balanceAfter} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end gap-8 border-t pt-3 text-sm">
        <span>
          {t("doctorPartners.statement.totalDebit")}: <b dir="ltr"><Money value={totalDebit} /></b>
        </span>
        <span>
          {t("doctorPartners.statement.totalCredit")}: <b dir="ltr"><Money value={totalCredit} /></b>
        </span>
        <span className="font-bold">
          {t("doctorPartners.statement.closing")}: <b dir="ltr"><Money value={closingBalance} /></b>
        </span>
      </div>
    </div>
  );
});
