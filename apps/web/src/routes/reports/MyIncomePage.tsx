import { formatCurrency, formatNumber } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/ui/money";

import { Icon } from "@/components/ui/icon";
import { useMyIncome } from "@/queries/reports";
import { DEFAULT_PERIOD, resolvePeriod, type PeriodValue } from "@/routes/reports/period";
import { ReportExportButtons } from "@/routes/reports/ReportExportButtons";
import { ReportFilterBar } from "@/routes/reports/ReportFilterBar";
import { StatCard } from "@/routes/reports/StatCard";

/**
 * Doctor self-service income (task 5). Reads `/reports/my-income` — auth-only + self-scoped to the
 * caller, so a doctor without `reports.read` sees only their own figures and never another doctor's.
 */
export function MyIncomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  const range = useMemo(() => resolvePeriod(period), [period]);
  const d = useMyIncome(range).data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("reports.myIncome.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("reports.myIncome.subtitle")}</p>
      </div>

      <ReportFilterBar
        value={period}
        onChange={setPeriod}
        actions={<ReportExportButtons path="/reports/my-income" params={range} />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          tone="teal"
          icon={<Icon.stethoscope className="size-5" />}
          value={formatNumber(d?.totalVisitCount ?? 0, lang)}
          label={t("reports.myIncome.visits")}
        />
        <StatCard
          tone="navy"
          icon={<Icon.receipt className="size-5" />}
          value={<Money value={d?.totalRevenue ?? 0} />}
          label={t("reports.myIncome.revenue")}
        />
        <StatCard
          tone="green"
          icon={<Icon.shield className="size-5" />}
          value={<Money value={d?.totalCalculatedShare ?? 0} />}
          label={t("reports.myIncome.share")}
        />
      </div>
    </div>
  );
}
