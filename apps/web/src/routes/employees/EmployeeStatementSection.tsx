import { formatDate, formatNumber, type EmployeeStatementParams } from "@vet/shared";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useEmployeeStatement } from "@/queries/employees";
import { EmployeeStatementDocument } from "@/routes/employees/EmployeeStatementDocument";

type RangeKey = "all" | "90d" | "year" | "custom";

const RANGES: { key: RangeKey; labelKey: string }[] = [
  { key: "all", labelKey: "employees.statement.rangeAll" },
  { key: "90d", labelKey: "employees.statement.range90" },
  { key: "year", labelKey: "employees.statement.rangeYear" },
  { key: "custom", labelKey: "employees.statement.rangeCustom" },
];

/** Maps the chosen range to inclusive ISO `from`/`to` bounds the statement endpoint expects. */
function rangeToParams(range: RangeKey, from: string, to: string): EmployeeStatementParams {
  const now = new Date();
  if (range === "90d") {
    const f = new Date(now);
    f.setDate(f.getDate() - 90);
    return { from: f.toISOString() };
  }
  if (range === "year") {
    return { from: new Date(now.getFullYear(), 0, 1).toISOString() };
  }
  if (range === "custom") {
    const params: EmployeeStatementParams = {};
    if (from) params.from = `${from}T00:00:00.000Z`;
    if (to) params.to = `${to}T23:59:59.999Z`;
    return params;
  }
  return {}; // all
}

/**
 * An employee HR-account statement — running balance, date filter, print. The HR mirror of the supplier
 * StatementSection, minus the WhatsApp share (an employee record has no phone — payroll is internal).
 * `debit` = an accrual / loan-repayment (raises the payable), `credit` = a salary payment or a loan paid
 * out. Positive balances = the clinic owes the employee unpaid salary.
 */
export function EmployeeStatementSection({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [range, setRange] = useState<RangeKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const params = useMemo(
    () => rangeToParams(range, customFrom, customTo),
    [range, customFrom, customTo],
  );
  const query = useEmployeeStatement(employeeId, params);
  const stmt = query.data;
  const entries = stmt?.entries ?? [];

  const { totalDebit, totalCredit } = useMemo(() => {
    let d = 0;
    let c = 0;
    for (const e of entries) {
      if (e.amount > 0) d += e.amount;
      else c += -e.amount;
    }
    return { totalDebit: d, totalCredit: c };
  }, [entries]);

  const periodLabel =
    range === "custom"
      ? [customFrom, customTo].filter(Boolean).join(" — ") || t("employees.statement.rangeCustom")
      : t(RANGES.find((r) => r.key === range)!.labelKey);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${t("employees.statement.reportTitle")} - ${employeeName}`,
  });

  const balanceClass = (n: number) => (n > 0 ? "text-destructive" : n < 0 ? "text-success" : "");

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{t("employees.statement.title")}</h2>
        <Button size="sm" variant="secondary" onClick={() => handlePrint()}>
          <Icon.print className="size-4" />
          {t("employees.statement.print")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              range === r.key
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(r.labelKey)}
          </button>
        ))}
        {range === "custom" ? (
          <div className="flex items-center gap-2">
            <DatePicker
              containerClassName="w-40"
              aria-label={t("employees.statement.from")}
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <span className="text-muted-foreground">—</span>
            <DatePicker
              containerClassName="w-40"
              aria-label={t("employees.statement.to")}
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("employees.statement.colDate")}</TableHead>
              <TableHead>{t("employees.statement.colRef")}</TableHead>
              <TableHead>{t("employees.statement.colType")}</TableHead>
              <TableHead>{t("employees.statement.colDescription")}</TableHead>
              <TableHead className="text-end">{t("employees.statement.colDebit")}</TableHead>
              <TableHead className="text-end">{t("employees.statement.colCredit")}</TableHead>
              <TableHead className="text-end">{t("employees.statement.colBalance")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-20 text-center">
                  <Icon.spinner className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-20 text-center text-sm text-muted-foreground">
                  {t("employees.statement.empty")}
                </TableCell>
              </TableRow>
            ) : (
              <>
                <TableRow className="text-muted-foreground hover:bg-transparent">
                  <TableCell colSpan={6}>{t("employees.statement.opening")}</TableCell>
                  <TableCell className="text-end font-medium">
                    <Money value={stmt?.openingBalance ?? 0} />
                  </TableCell>
                </TableRow>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    {/* dir="ltr" cells need text-end (= right inside LTR) to line up with the
                        RTL headers; amount cells stay RTL so text-end = the header's left edge. */}
                    <TableCell className="text-end" dir="ltr">
                      {formatDate(e.createdAt, lang)}
                    </TableCell>
                    <TableCell className="text-end font-mono text-xs" dir="ltr">
                      {e.employeePaymentId ? `#${e.employeePaymentId.slice(0, 8)}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.amount < 0 ? "success" : "default"}>
                        {t(`employeeLedgerEntryType.${e.entryType}`, { defaultValue: e.entryType })}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate">{e.description ?? "—"}</TableCell>
                    <TableCell className="text-end">
                      {e.amount > 0 ? (
                        <Money value={e.amount} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-end text-success">
                      {e.amount < 0 ? (
                        <Money value={-e.amount} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className={cn("text-end font-medium", balanceClass(e.balanceAfter))}>
                      <Money value={e.balanceAfter} />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>

        {entries.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-[var(--paper-soft)] p-3 text-sm">
            <span className="text-muted-foreground">
              {t("employees.statement.movementsCount", {
                count: formatNumber(entries.length, lang),
              })}
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <span>
                {t("employees.statement.totalDebit")}:{" "}
                <b className="text-destructive" dir="ltr">
                  <Money value={totalDebit} />
                </b>
              </span>
              <span>
                {t("employees.statement.totalCredit")}:{" "}
                <b className="text-success" dir="ltr">
                  <Money value={totalCredit} />
                </b>
              </span>
              <span className="font-semibold">
                {t("employees.statement.closing")}:{" "}
                <b className={balanceClass(stmt?.closingBalance ?? 0)} dir="ltr">
                  <Money value={stmt?.closingBalance ?? 0} />
                </b>
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Off-screen printable document — react-to-print clones this node into a print iframe. */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }} aria-hidden>
        {stmt ? (
          <EmployeeStatementDocument
            ref={printRef}
            employeeName={employeeName}
            periodLabel={periodLabel}
            entries={entries}
            openingBalance={stmt.openingBalance}
            closingBalance={stmt.closingBalance}
            totalDebit={totalDebit}
            totalCredit={totalCredit}
          />
        ) : null}
      </div>
    </section>
  );
}
