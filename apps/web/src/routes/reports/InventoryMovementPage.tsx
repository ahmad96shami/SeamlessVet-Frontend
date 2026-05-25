import type { ColumnDef } from "@tanstack/react-table";
import { formatNumber, type InventoryMovementRow } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { Select } from "@/components/ui/select";
import { useProductLookup } from "@/hooks/useProductLookup";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useInventoryMovement } from "@/queries/reports";
import { DEFAULT_PERIOD, resolvePeriod, type PeriodValue } from "@/routes/reports/period";
import { ReportExportButtons } from "@/routes/reports/ReportExportButtons";
import { ReportFilterBar } from "@/routes/reports/ReportFilterBar";
import { ReportPageHeader } from "@/routes/reports/ReportPageHeader";

export function InventoryMovementPage() {
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
  const query = useInventoryMovement({ ...params, skip, take });
  const rows = query.data?.rows ?? [];

  const trend = (net: number) =>
    net > 0
      ? <span className="pill green">{t("reports.inventoryMovement.trendUp")}</span>
      : net < 0
        ? <span className="pill amber">{t("reports.inventoryMovement.trendDown")}</span>
        : <span className="pill gray">{t("reports.inventoryMovement.trendFlat")}</span>;

  const columns = useMemo<ColumnDef<InventoryMovementRow>[]>(
    () => [
      {
        accessorKey: "productId",
        header: t("reports.inventoryMovement.colProduct"),
        cell: ({ row }) => (
          <span className="font-medium">{products.byId.get(row.original.productId)?.nameAr ?? row.original.productId}</span>
        ),
      },
      {
        accessorKey: "locationType",
        header: t("reports.inventoryMovement.colLocation"),
        cell: ({ row }) =>
          t(`reports.filters.${row.original.locationType === "warehouse" ? "warehouse" : "field"}`),
      },
      {
        accessorKey: "inflows",
        header: t("reports.inventoryMovement.colIn"),
        cell: ({ row }) => <span className="tabular-nums" style={{ color: "var(--green)" }}>+{formatNumber(row.original.inflows, lang)}</span>,
      },
      {
        accessorKey: "outflows",
        header: t("reports.inventoryMovement.colOut"),
        cell: ({ row }) => <span className="tabular-nums" style={{ color: "var(--red)" }}>−{formatNumber(row.original.outflows, lang)}</span>,
      },
      {
        id: "trend",
        header: t("reports.inventoryMovement.colNet"),
        cell: ({ row }) => trend(row.original.netChange),
      },
      {
        accessorKey: "balance",
        header: t("reports.inventoryMovement.colBalance"),
        cell: ({ row }) => <span className="font-semibold tabular-nums">{formatNumber(row.original.balance, lang)}</span>,
      },
    ],
    [t, lang, products.byId],
  );

  return (
    <div className="space-y-4">
      <ReportPageHeader titleKey="reports.inventoryMovement.title" subtitleKey="reports.inventoryMovement.subtitle" />

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
        actions={<ReportExportButtons path="/reports/inventory-movement" params={params} />}
      />

      <DataTable columns={columns} data={rows} isLoading={query.isLoading} emptyMessage={t("reports.inventoryMovement.empty")} />
      <Pagination page={page + 1} canPrev={canPrev} canNext={rows.length === take} onPrev={prev} onNext={next} />
    </div>
  );
}
