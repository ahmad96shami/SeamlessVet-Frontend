import type { ColumnDef } from "@tanstack/react-table";
import { formatNumber, type ConsumablesReportRow } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Money } from "@/components/ui/money";
import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { Select } from "@/components/ui/select";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useProductLookup } from "@/hooks/useProductLookup";
import { useConsumables } from "@/queries/reports";
import { DEFAULT_PERIOD, resolvePeriod, type PeriodValue } from "@/routes/reports/period";
import { ReportExportButtons } from "@/routes/reports/ReportExportButtons";
import { ReportFilterBar } from "@/routes/reports/ReportFilterBar";
import { ReportPageHeader } from "@/routes/reports/ReportPageHeader";
import { SummaryGrid, SummaryStat } from "@/routes/reports/SummaryStat";

/** The consumables report (M27): internal-use consumption summed by (location, product), with FEFO
 *  cost. Filterable by period / product / location; exportable to xlsx / pdf. */
export function ConsumablesReportPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  const [productId, setProductId] = useState("");
  const [locationType, setLocationType] = useState("");
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);
  const range = useMemo(() => resolvePeriod(period), [period]);

  useEffect(() => reset(), [period, productId, locationType, reset]);

  const products = useProductLookup();
  const params = {
    ...range,
    productId: productId || undefined,
    locationType: locationType || undefined,
  };
  const query = useConsumables({ ...params, skip, take });
  const data = query.data;
  const rows = data?.rows ?? [];

  const columns = useMemo<ColumnDef<ConsumablesReportRow>[]>(
    () => [
      {
        accessorKey: "productName",
        header: t("reports.consumables.colProduct"),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.productName || products.byId.get(row.original.productId)?.nameAr || row.original.productId}
          </span>
        ),
      },
      {
        accessorKey: "locationType",
        header: t("reports.consumables.colLocation"),
        cell: ({ row }) =>
          t(`reports.filters.${row.original.locationType === "warehouse" ? "warehouse" : "field"}`),
      },
      {
        accessorKey: "quantity",
        header: t("reports.consumables.colQuantity"),
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.quantity, lang)}</span>,
      },
      {
        accessorKey: "cost",
        header: t("reports.consumables.colCost"),
        cell: ({ row }) => <Money value={row.original.cost} />,
      },
    ],
    [t, lang, products.byId],
  );

  return (
    <div className="space-y-4">
      <ReportPageHeader titleKey="reports.consumables.title" subtitleKey="reports.consumables.subtitle" />

      <SummaryGrid>
        <SummaryStat
          label={t("reports.consumables.totalQuantity")}
          value={formatNumber(data?.totalQuantity ?? 0, lang)}
        />
        <SummaryStat
          label={t("reports.consumables.totalCost")}
          value={<Money value={data?.totalCost ?? 0} />}
          tone="teal"
        />
      </SummaryGrid>

      <ReportFilterBar
        value={period}
        onChange={setPeriod}
        filters={
          <>
            <Select value={productId} onChange={(e) => setProductId(e.target.value)} containerClassName="w-56">
              <option value="">{t("reports.filters.allProducts")}</option>
              {[...products.byId.values()].map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameAr}
                </option>
              ))}
            </Select>
            <Select value={locationType} onChange={(e) => setLocationType(e.target.value)} containerClassName="w-40">
              <option value="">{t("reports.filters.allLocations")}</option>
              <option value="warehouse">{t("reports.filters.warehouse")}</option>
              <option value="field">{t("reports.filters.field")}</option>
            </Select>
          </>
        }
        actions={<ReportExportButtons path="/reports/consumables" params={params} />}
      />

      <DataTable columns={columns} data={rows} isLoading={query.isLoading} emptyMessage={t("reports.consumables.empty")} />
      <Pagination page={page + 1} canPrev={canPrev} canNext={rows.length === take} onPrev={prev} onNext={next} />
    </div>
  );
}
