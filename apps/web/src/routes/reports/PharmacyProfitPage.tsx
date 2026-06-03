import type { ColumnDef } from "@tanstack/react-table";
import { formatNumber, type PharmacyProfitRow } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { Money } from "@/components/ui/money";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { usePharmacyProfit } from "@/queries/reports";
import { DEFAULT_PERIOD, resolvePeriod, type PeriodValue } from "@/routes/reports/period";
import { ReportExportButtons } from "@/routes/reports/ReportExportButtons";
import { ReportFilterBar } from "@/routes/reports/ReportFilterBar";
import { ReportPageHeader } from "@/routes/reports/ReportPageHeader";
import { SummaryGrid, SummaryStat } from "@/routes/reports/SummaryStat";

/** Drug/product gross margin per product (M20); `cost` reconciles to clinic-profits `cogs`. */
export function PharmacyProfitPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);
  const range = useMemo(() => resolvePeriod(period), [period]);

  useEffect(() => reset(), [period, reset]);

  const query = usePharmacyProfit({ ...range, skip, take });
  const d = query.data;
  const rows = d?.rows ?? [];
  const total = d?.totalCount ?? 0;

  const columns = useMemo<ColumnDef<PharmacyProfitRow>[]>(
    () => [
      {
        accessorKey: "productName",
        header: t("reports.pharmacyProfit.colProduct"),
        cell: ({ row }) => <span className="font-medium">{row.original.productName}</span>,
      },
      {
        accessorKey: "quantitySold",
        header: t("reports.pharmacyProfit.colQuantity"),
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.quantitySold, lang)}</span>,
      },
      {
        accessorKey: "revenue",
        header: t("reports.pharmacyProfit.colRevenue"),
        cell: ({ row }) => <Money value={row.original.revenue} />,
      },
      {
        accessorKey: "cost",
        header: t("reports.pharmacyProfit.colCost"),
        cell: ({ row }) => <Money value={row.original.cost} />,
      },
      {
        accessorKey: "profit",
        header: t("reports.pharmacyProfit.colProfit"),
        cell: ({ row }) => (
          <span className="font-semibold" style={{ color: row.original.profit < 0 ? "var(--red)" : "var(--green)" }}>
            <Money value={row.original.profit} />
          </span>
        ),
      },
    ],
    [t, lang],
  );

  return (
    <div className="space-y-4">
      <ReportPageHeader titleKey="reports.pharmacyProfit.title" subtitleKey="reports.pharmacyProfit.subtitle" />

      <ReportFilterBar
        value={period}
        onChange={setPeriod}
        actions={<ReportExportButtons path="/reports/pharmacy-profit" params={range} />}
      />

      <SummaryGrid>
        <SummaryStat label={t("reports.pharmacyProfit.revenue")} value={<Money value={d?.revenue ?? 0} />} />
        <SummaryStat
          label={t("reports.pharmacyProfit.cost")}
          value={<Money value={d?.cost ?? 0} />}
          tone="red"
          hint={t("reports.pharmacyProfit.reconcileHint")}
        />
        <SummaryStat label={t("reports.pharmacyProfit.profit")} value={<Money value={d?.profit ?? 0} />} tone="teal" />
        <SummaryStat label={t("reports.pharmacyProfit.productCount")} value={formatNumber(total, lang)} />
      </SummaryGrid>

      <DataTable columns={columns} data={rows} isLoading={query.isLoading} emptyMessage={t("reports.pharmacyProfit.empty")} />
      <Pagination page={page + 1} canPrev={canPrev} canNext={skip + take < total} onPrev={prev} onNext={next} />
    </div>
  );
}
