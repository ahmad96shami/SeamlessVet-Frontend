import type { ColumnDef } from "@tanstack/react-table";
import {
  formatDate,
  formatNumber,
  formatQuantity,
  type ExpiringProduct,
  type StockLevelResponse,
} from "@vet/shared";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/data-table/DataTable";
import { AdminPage } from "@/components/layout/AdminPage";
import { Badge } from "@/components/ui/badge";
import { useExpiringStock, useFieldInventories, useStock } from "@/queries/inventory";
import { InventoryTabs } from "@/routes/inventory/InventoryTabs";

export function AlertsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  // Low stock uses the server filter (same threshold as the M11 scan). Near-expiry is now
  // lot-accurate over /inventory/expiring (M25): one row per on-hand lot within the warning window.
  const lowStock = useStock({ lowStockOnly: true, take: 200 });
  const expiring = useExpiringStock();

  const fieldInvs = useFieldInventories();
  const doctorByLocation = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of fieldInvs.data ?? []) map.set(f.id, f.doctorName);
    return map;
  }, [fieldInvs.data]);
  const locationLabel = useCallback(
    (r: StockLevelResponse) =>
      r.locationType === "field"
        ? (doctorByLocation.get(r.locationId) ?? t("inventory.location.field"))
        : t("inventory.location.warehouse"),
    [doctorByLocation, t],
  );

  const lowRows = lowStock.data ?? [];
  const expiringRows = expiring.data ?? [];

  const lowColumns = useMemo<ColumnDef<StockLevelResponse>[]>(
    () => [
      {
        accessorKey: "nameAr",
        header: t("inventory.col.product"),
        cell: ({ row }) => <span className="font-medium">{row.original.nameAr}</span>,
      },
      { id: "location", header: t("inventory.col.location"), cell: ({ row }) => locationLabel(row.original) },
      {
        accessorKey: "quantity",
        header: t("inventory.col.quantity"),
        cell: ({ row }) => formatQuantity(row.original.quantity, lang),
      },
      {
        accessorKey: "reorderPoint",
        header: t("inventory.col.reorderPoint"),
        cell: ({ row }) => formatQuantity(row.original.reorderPoint, lang),
      },
      {
        id: "status",
        header: t("inventory.col.status"),
        cell: ({ row }) =>
          row.original.quantity <= 0 ? (
            <Badge variant="destructive">{t("inventory.status.out")}</Badge>
          ) : (
            <Badge variant="warning">{t("inventory.status.low")}</Badge>
          ),
      },
    ],
    [t, lang, locationLabel],
  );

  const expiryColumns = useMemo<ColumnDef<ExpiringProduct>[]>(
    () => [
      {
        accessorKey: "productNameAr",
        header: t("inventory.col.product"),
        cell: ({ row }) => <span className="font-medium">{row.original.productNameAr}</span>,
      },
      {
        accessorKey: "lotNumber",
        header: t("inventory.col.lotNumber"),
        cell: ({ row }) =>
          row.original.lotNumber ? (
            <span dir="ltr">{row.original.lotNumber}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "expirationDate",
        header: t("inventory.col.expiry"),
        cell: ({ row }) => (
          <span dir="ltr">{formatDate(row.original.expirationDate, lang)}</span>
        ),
      },
      {
        accessorKey: "nearExpiryQuantity",
        header: t("inventory.col.nearExpiryQty"),
        cell: ({ row }) => (
          <span className="font-medium">
            {formatQuantity(row.original.nearExpiryQuantity, lang)}
            <span className="text-xs text-muted-foreground">
              {" / "}
              {formatQuantity(row.original.quantityOnHand, lang)}
            </span>
          </span>
        ),
      },
      {
        id: "status",
        header: t("inventory.col.status"),
        cell: ({ row }) => {
          const d = row.original.daysUntilExpiry;
          return d < 0 ? (
            <Badge variant="destructive">
              {t("inventory.alerts.expiredAgo", { days: formatNumber(Math.abs(d), lang) })}
            </Badge>
          ) : (
            <Badge variant="warning">
              {t("inventory.alerts.daysLeft", { days: formatNumber(d, lang) })}
            </Badge>
          );
        },
      },
    ],
    [t, lang],
  );

  return (
    <AdminPage title={t("inventory.alerts.title")} description={t("inventory.alerts.description")}>
      <div className="space-y-6">
        <InventoryTabs />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <div className="text-sm text-muted-foreground">{t("inventory.alerts.lowStockTitle")}</div>
            <div className="text-2xl font-bold">{formatNumber(lowRows.length, lang)}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-sm text-muted-foreground">{t("inventory.alerts.expiringTitle")}</div>
            <div className="text-2xl font-bold">{formatNumber(expiringRows.length, lang)}</div>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("inventory.alerts.lowStockTitle")}</h2>
          <DataTable
            columns={lowColumns}
            data={lowRows}
            isLoading={lowStock.isLoading}
            emptyMessage={t("inventory.alerts.noLowStock")}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("inventory.alerts.expiringTitle")}</h2>
          <DataTable
            columns={expiryColumns}
            data={expiringRows}
            isLoading={expiring.isLoading}
            emptyMessage={t("inventory.alerts.noExpiring")}
          />
        </section>
      </div>
    </AdminPage>
  );
}
