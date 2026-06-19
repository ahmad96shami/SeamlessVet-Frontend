import { formatDate, type EmployeeLedgerEntryResponse } from "@vet/shared";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import { Money } from "@/components/ui/money";
import { useCenterName } from "@/hooks/useCenterName";

export interface EmployeeStatementDocumentProps {
  employeeName: string;
  periodLabel: string;
  entries: EmployeeLedgerEntryResponse[];
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
}

/**
 * Printable employee account statement (A4) — the HR mirror of the supplier StatementDocument.
 * Rendered off-screen; `react-to-print` clones it into a print iframe (copying the app's stylesheets).
 * RTL Arabic. `debit` = an accrual / loan-repayment (increases the payable), `credit` = a salary
 * payment or a loan paid out.
 */
export const EmployeeStatementDocument = forwardRef<HTMLDivElement, EmployeeStatementDocumentProps>(
  function EmployeeStatementDocument(
    { employeeName, periodLabel, entries, openingBalance, closingBalance, totalDebit, totalCredit },
    ref,
  ) {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const centerName = useCenterName();
    const refOf = (e: EmployeeLedgerEntryResponse) =>
      e.employeePaymentId ? `#${e.employeePaymentId.slice(0, 8)}` : "—";

    return (
      <div
        ref={ref}
        dir="rtl"
        className="bg-white p-8 text-navy-900"
        style={{ width: "210mm", fontFamily: "Tajawal, sans-serif" }}
      >
        <div className="mb-6 flex items-start justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-extrabold" dir="auto">{centerName}</h1>
          </div>
          <div className="text-end">
            <h2 className="text-lg font-bold">{t("employees.statement.reportTitle")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("employees.statement.generatedAt", { date: formatDate(new Date(), lang) })}
            </p>
          </div>
        </div>

        <div className="mb-4 flex justify-between text-sm">
          <div className="font-bold">{employeeName}</div>
          <div className="text-muted-foreground">{periodLabel}</div>
        </div>

        <table className="w-full border-collapse text-sm" style={{ direction: "rtl" }}>
          <thead>
            <tr className="border-y bg-[var(--paper-soft)] text-start">
              <th className="p-2 text-start font-semibold">{t("employees.statement.colDate")}</th>
              <th className="p-2 text-start font-semibold">{t("employees.statement.colRef")}</th>
              <th className="p-2 text-start font-semibold">{t("employees.statement.colType")}</th>
              <th className="p-2 text-start font-semibold">
                {t("employees.statement.colDescription")}
              </th>
              <th className="p-2 text-end font-semibold">{t("employees.statement.colDebit")}</th>
              <th className="p-2 text-end font-semibold">{t("employees.statement.colCredit")}</th>
              <th className="p-2 text-end font-semibold">{t("employees.statement.colBalance")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b text-muted-foreground">
              <td className="p-2" colSpan={6}>
                {t("employees.statement.opening")}
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
                  {t(`employeeLedgerEntryType.${e.entryType}`, { defaultValue: e.entryType })}
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
            {t("employees.statement.totalDebit")}:{" "}
            <b dir="ltr">
              <Money value={totalDebit} />
            </b>
          </span>
          <span>
            {t("employees.statement.totalCredit")}:{" "}
            <b dir="ltr">
              <Money value={totalCredit} />
            </b>
          </span>
          <span className="font-bold">
            {t("employees.statement.closing")}:{" "}
            <b dir="ltr">
              <Money value={closingBalance} />
            </b>
          </span>
        </div>
      </div>
    );
  },
);
