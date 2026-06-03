import type { ColumnDef } from "@tanstack/react-table";
import { formatNumber, type VisitProfitRow, type VisitProfitScope } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { useCustomerLookup } from "@/hooks/useCustomerLookup";
import { useFarmLookup } from "@/hooks/useFarmLookup";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useFieldVisitProfit, useInClinicVisitProfit } from "@/queries/reports";
import { DEFAULT_PERIOD, resolvePeriod, type PeriodValue } from "@/routes/reports/period";
import { ReportExportButtons } from "@/routes/reports/ReportExportButtons";
import { ReportFilterBar } from "@/routes/reports/ReportFilterBar";
import { ReportPageHeader } from "@/routes/reports/ReportPageHeader";
import { SummaryGrid, SummaryStat } from "@/routes/reports/SummaryStat";

/** The two M20 visit-profit slices share one page; only hook, export path and i18n ns differ. */
const VARIANTS = {
  in_clinic: { ns: "reports.inClinicVisitProfit", path: "/reports/in-clinic-visit-profit" },
  field: { ns: "reports.fieldVisitProfit", path: "/reports/field-visit-profit" },
} as const;

/**
 * Per-visit gross margin (revenue ex-tax − product-line COGS) for one visit type, optionally
 * sliced by the visit's farm/clinic attribution (M16 `Visit.farmId`). Rows are offset-paged;
 * the summary spans the whole filtered window.
 */
function VisitProfitReportPage({ variant }: { variant: keyof typeof VARIANTS }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { ns, path } = VARIANTS[variant];
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  const [scope, setScope] = useState<VisitProfitScope | "">("");
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);
  const range = useMemo(() => resolvePeriod(period), [period]);

  useEffect(() => reset(), [period, scope, reset]);

  const customers = useCustomerLookup();
  const farms = useFarmLookup();
  const params = { ...range, scope: scope || undefined };
  // Stable per mount: the two wrapper pages are distinct route components, so React remounts on switch.
  const useVariantQuery = variant === "field" ? useFieldVisitProfit : useInClinicVisitProfit;
  const query = useVariantQuery({ ...params, skip, take });
  const d = query.data;
  const rows = d?.rows ?? [];
  const total = d?.visitCount ?? 0;

  const columns = useMemo<ColumnDef<VisitProfitRow>[]>(
    () => [
      {
        accessorKey: "visitNumber",
        header: t(`${ns}.colVisit`),
        cell: ({ row }) => <span className="t-mono">{row.original.visitNumber ?? row.original.visitId.slice(0, 8)}</span>,
      },
      {
        accessorKey: "customerId",
        header: t(`${ns}.colCustomer`),
        cell: ({ row }) => customers.byId.get(row.original.customerId)?.fullName ?? "—",
      },
      {
        accessorKey: "farmId",
        header: t(`${ns}.colFarm`),
        cell: ({ row }) => (row.original.farmId ? (farms.byId.get(row.original.farmId)?.name ?? "—") : "—"),
      },
      {
        accessorKey: "revenue",
        header: t(`${ns}.colRevenue`),
        cell: ({ row }) => <Money value={row.original.revenue} />,
      },
      {
        accessorKey: "cogs",
        header: t(`${ns}.colCogs`),
        cell: ({ row }) => <Money value={row.original.cogs} />,
      },
      {
        accessorKey: "profit",
        header: t(`${ns}.colProfit`),
        cell: ({ row }) => (
          <span className="font-semibold" style={{ color: row.original.profit < 0 ? "var(--red)" : "var(--green)" }}>
            <Money value={row.original.profit} />
          </span>
        ),
      },
    ],
    [t, ns, customers.byId, farms.byId],
  );

  return (
    <div className="space-y-4">
      <ReportPageHeader titleKey={`${ns}.title`} subtitleKey={`${ns}.subtitle`} />

      <ReportFilterBar
        value={period}
        onChange={setPeriod}
        filters={
          <Select
            value={scope}
            onChange={(e) => setScope(e.target.value as VisitProfitScope | "")}
            aria-label={t(`${ns}.scope`)}
            containerClassName="w-40"
          >
            <option value="">{t(`${ns}.scopeAll`)}</option>
            <option value="farm">{t(`${ns}.scopeFarm`)}</option>
            <option value="clinic">{t(`${ns}.scopeClinic`)}</option>
          </Select>
        }
        actions={<ReportExportButtons path={path} params={params} />}
      />

      <SummaryGrid>
        <SummaryStat label={t(`${ns}.revenue`)} value={<Money value={d?.revenue ?? 0} />} />
        <SummaryStat label={t(`${ns}.cogs`)} value={<Money value={d?.cogs ?? 0} />} tone="red" />
        <SummaryStat label={t(`${ns}.profit`)} value={<Money value={d?.profit ?? 0} />} tone="teal" />
        <SummaryStat label={t(`${ns}.visitCount`)} value={formatNumber(total, lang)} />
      </SummaryGrid>

      <DataTable columns={columns} data={rows} isLoading={query.isLoading} emptyMessage={t(`${ns}.empty`)} />
      <Pagination page={page + 1} canPrev={canPrev} canNext={skip + take < total} onPrev={prev} onNext={next} />
    </div>
  );
}

export function InClinicVisitProfitPage() {
  return <VisitProfitReportPage variant="in_clinic" />;
}

export function FieldVisitProfitPage() {
  return <VisitProfitReportPage variant="field" />;
}
