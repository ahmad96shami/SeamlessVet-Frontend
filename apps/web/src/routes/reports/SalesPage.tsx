import { formatCurrency, formatNumber } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/ui/money";

import { Select } from "@/components/ui/select";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { useSalesReport } from "@/queries/reports";
import { DEFAULT_PERIOD, resolvePeriod, type PeriodValue } from "@/routes/reports/period";
import { ReportExportButtons } from "@/routes/reports/ReportExportButtons";
import { ReportFilterBar } from "@/routes/reports/ReportFilterBar";
import { ReportPageHeader } from "@/routes/reports/ReportPageHeader";
import { SummaryGrid, SummaryStat } from "@/routes/reports/SummaryStat";

export function SalesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  const [cashierId, setCashierId] = useState("");
  const range = useMemo(() => resolvePeriod(period), [period]);
  // The cashier filter has no dedicated endpoint; reuse the doctor source as the staff picker
  // (the only authenticated user list available to non-admin roles — the useDoctorOptions precedent).
  const staff = useDoctorOptions();
  const params = { ...range, cashierId: cashierId || undefined };
  const d = useSalesReport(params).data;
  const byMethod = d?.byMethod ?? [];

  return (
    <div className="space-y-4">
      <ReportPageHeader titleKey="reports.sales.title" subtitleKey="reports.sales.subtitle" />

      <ReportFilterBar
        value={period}
        onChange={setPeriod}
        filters={
          <Select value={cashierId} onChange={(e) => setCashierId(e.target.value)} containerClassName="w-48">
            <option value="">{t("reports.filters.cashier")}: {t("reports.filters.allDoctors")}</option>
            {staff.options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        }
        actions={<ReportExportButtons path="/reports/sales" params={params} />}
      />

      <SummaryGrid className="sm:grid-cols-2 lg:grid-cols-2">
        <SummaryStat label={t("reports.sales.total")} value={<Money value={d?.total ?? 0} />} tone="teal" />
        <SummaryStat label={t("reports.sales.invoiceCount")} value={formatNumber(d?.invoiceCount ?? 0, lang)} />
      </SummaryGrid>

      <div className="card flush">
        <div className="card-head">
          <h3>{t("reports.sales.colMethod")}</h3>
        </div>
        {byMethod.length > 0 ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("reports.sales.colMethod")}</th>
                <th className="num">{t("reports.sales.colPayments")}</th>
                <th className="num">{t("reports.sales.colAmount")}</th>
              </tr>
            </thead>
            <tbody>
              {byMethod.map((m) => (
                <tr key={m.method}>
                  <td className="font-medium">{t(`paymentMethod.${m.method}`, { defaultValue: m.method })}</td>
                  <td className="num">{formatNumber(m.paymentCount, lang)}</td>
                  <td className="num font-semibold"><Money value={m.amount} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-6 text-center text-sm text-muted-foreground">{t("reports.sales.empty")}</p>
        )}
      </div>
    </div>
  );
}
