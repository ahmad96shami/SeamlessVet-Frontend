import { formatCurrency, formatDate, formatPercent } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/ui/money";

import { useClinicProfits } from "@/queries/reports";
import { DEFAULT_PERIOD, resolvePeriod, type PeriodValue } from "@/routes/reports/period";
import { ReportExportButtons } from "@/routes/reports/ReportExportButtons";
import { ReportFilterBar } from "@/routes/reports/ReportFilterBar";
import { ReportPageHeader } from "@/routes/reports/ReportPageHeader";
import { SummaryGrid, SummaryStat } from "@/routes/reports/SummaryStat";

export function ClinicProfitsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  const range = useMemo(() => resolvePeriod(period), [period]);
  const query = useClinicProfits(range);
  const d = query.data;

  return (
    <div className="space-y-4">
      <ReportPageHeader titleKey="reports.clinicProfits.title" subtitleKey="reports.clinicProfits.subtitle" />

      <ReportFilterBar
        value={period}
        onChange={setPeriod}
        actions={<ReportExportButtons path="/reports/clinic-profits" params={range} />}
      />

      <SummaryGrid>
        <SummaryStat label={t("reports.clinicProfits.revenue")} value={<Money value={d?.revenue ?? 0} />} />
        <SummaryStat label={t("reports.clinicProfits.cogs")} value={<Money value={d?.cogs ?? 0} />} tone="red" />
        <SummaryStat label={t("reports.clinicProfits.netProfit")} value={<Money value={d?.netProfit ?? 0} />} tone="teal" />
        <SummaryStat
          label={t("reports.clinicProfits.doctorShares")}
          value={<Money value={d?.doctorShares ?? 0} />}
          hint={t("reports.clinicProfits.doctorSharesHint")}
        />
        <SummaryStat label={t("reports.clinicProfits.distributed")} value={<Money value={d?.distributedToPartners ?? 0} />} tone="navy" />
        <SummaryStat label={t("reports.clinicProfits.retained")} value={<Money value={d?.retainedByClinic ?? 0} />} tone="green" />
      </SummaryGrid>

      <div className="card flush">
        <div className="card-head">
          <h3>{t("reports.clinicProfits.partnerSplit")}</h3>
          {d ? <span className="cap-12">{t("reports.common.asOf")} {formatDate(d.asOf, lang)}</span> : null}
        </div>
        {d && d.partnerAllocations.length > 0 ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("reports.clinicProfits.colPartner")}</th>
                <th className="num">{t("reports.clinicProfits.colSharePct")}</th>
                <th className="num">{t("reports.clinicProfits.colAmount")}</th>
              </tr>
            </thead>
            <tbody>
              {d.partnerAllocations.map((p) => (
                <tr key={p.partnerId}>
                  <td className="font-medium">{p.displayName}</td>
                  <td className="num">{formatPercent(p.sharePercent, lang)}</td>
                  <td className="num font-semibold"><Money value={p.amount} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-6 text-center text-sm text-muted-foreground">{t("reports.clinicProfits.noPartners")}</p>
        )}
      </div>
    </div>
  );
}
