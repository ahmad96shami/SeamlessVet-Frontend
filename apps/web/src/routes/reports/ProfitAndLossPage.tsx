import { formatCurrency } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/ui/money";

import { Icon } from "@/components/ui/icon";
import { useProfitAndLoss } from "@/queries/reports";
import { DEFAULT_PERIOD, resolvePeriod, type PeriodValue } from "@/routes/reports/period";
import { ReportExportButtons } from "@/routes/reports/ReportExportButtons";
import { ReportFilterBar } from "@/routes/reports/ReportFilterBar";
import { ReportPageHeader } from "@/routes/reports/ReportPageHeader";
import { SummaryGrid, SummaryStat } from "@/routes/reports/SummaryStat";

export function ProfitAndLossPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  const range = useMemo(() => resolvePeriod(period), [period]);
  const d = useProfitAndLoss(range).data;

  return (
    <div className="space-y-4">
      <ReportPageHeader titleKey="reports.profitAndLoss.title" subtitleKey="reports.profitAndLoss.subtitle" />

      <ReportFilterBar
        value={period}
        onChange={setPeriod}
        actions={<ReportExportButtons path="/reports/profit-and-loss" params={range} />}
      />

      <SummaryGrid>
        <SummaryStat label={t("reports.profitAndLoss.revenue")} value={<Money value={d?.revenue ?? 0} />} />
        <SummaryStat label={t("reports.profitAndLoss.cogs")} value={<Money value={d?.cogs ?? 0} />} tone="red" />
        <SummaryStat label={t("reports.profitAndLoss.grossProfit")} value={<Money value={d?.grossProfit ?? 0} />} tone="teal" />
        <SummaryStat label={t("reports.profitAndLoss.tax")} value={<Money value={d?.taxCollected ?? 0} />} />
        <SummaryStat label={t("reports.profitAndLoss.doctorShares")} value={<Money value={d?.doctorShares ?? 0} />} />
      </SummaryGrid>

      <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
        <Icon.shield className="size-4" />
        {t("reports.profitAndLoss.memoNote")}
      </div>
    </div>
  );
}
