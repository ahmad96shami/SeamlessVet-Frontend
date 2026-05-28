import { formatCurrency, formatDate, type CustomerResponse } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/ui/money";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useFarmAccountStatus } from "@/queries/reports";
import { CustomerPickerDialog } from "@/routes/pos/CustomerPickerDialog";
import { DEFAULT_PERIOD, resolvePeriod, type PeriodValue } from "@/routes/reports/period";
import { ReportExportButtons } from "@/routes/reports/ReportExportButtons";
import { ReportFilterBar } from "@/routes/reports/ReportFilterBar";
import { ReportPageHeader } from "@/routes/reports/ReportPageHeader";
import { SummaryGrid, SummaryStat } from "@/routes/reports/SummaryStat";

export function FarmAccountPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const range = useMemo(() => resolvePeriod(period), [period]);
  const query = useFarmAccountStatus(customer?.id ?? null, range);
  const d = query.data;

  return (
    <div className="space-y-4">
      <ReportPageHeader titleKey="reports.farmAccount.title" subtitleKey="reports.farmAccount.subtitle" />

      <ReportFilterBar
        value={period}
        onChange={setPeriod}
        filters={
          <Button variant="outline" onClick={() => setPickerOpen(true)}>
            <Icon.search className="size-4" />
            {customer ? customer.fullName : t("reports.filters.selectCustomer")}
          </Button>
        }
        actions={
          <ReportExportButtons
            path="/reports/farm-account-status"
            params={{ customerId: customer?.id, ...range }}
            disabled={!customer}
          />
        }
      />

      {!customer ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("reports.farmAccount.pickPrompt")}</p>
      ) : (
        <>
          <SummaryGrid className="sm:grid-cols-2 lg:grid-cols-2">
            <SummaryStat label={t("reports.farmAccount.opening")} value={<Money value={d?.openingBalance ?? 0} />} />
            <SummaryStat
              label={t("reports.farmAccount.closing")}
              value={<Money value={d?.closingBalance ?? 0} />}
              tone={(d?.closingBalance ?? 0) > 0 ? "red" : "green"}
            />
          </SummaryGrid>

          <div className="card flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("reports.farmAccount.colDate")}</th>
                  <th>{t("reports.farmAccount.colType")}</th>
                  <th className="num">{t("reports.farmAccount.colDebit")}</th>
                  <th className="num">{t("reports.farmAccount.colCredit")}</th>
                  <th className="num">{t("reports.farmAccount.colBalance")}</th>
                </tr>
              </thead>
              <tbody>
                {(d?.entries ?? []).map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.createdAt, lang)}</td>
                    <td>{t(`ledgerEntryType.${e.entryType}`, { defaultValue: e.entryType })}</td>
                    <td className="num">{e.amount > 0 ? formatCurrency(e.amount, lang) : "—"}</td>
                    <td className="num">{e.amount < 0 ? formatCurrency(-e.amount, lang) : "—"}</td>
                    <td className="num font-semibold"><Money value={e.balanceAfter} /></td>
                  </tr>
                ))}
                {(d?.entries.length ?? 0) === 0 && !query.isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      {t("reports.farmAccount.empty")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CustomerPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(c) => {
          setCustomer(c);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
