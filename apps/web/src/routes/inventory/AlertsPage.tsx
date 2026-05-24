import type { ColumnDef } from "@tanstack/react-table";
import { formatDate, formatNumber, formatQuantity, type StockLevelResponse } from "@vet/shared";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/data-table/DataTable";
import { AdminPage } from "@/components/layout/AdminPage";
import { Badge } from "@/components/ui/badge";
import { useFieldInventories, useStock } from "@/queries/inventory";
import { useSystemSettings } from "@/queries/systemSettings";
import { InventoryTabs } from "@/routes/inventory/InventoryTabs";

/** Whole days from today until the date (negative once past). Date-only comparison. */
function daysUntil(date: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(date);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - today.getTime()) / 86_400_000);
}

export function AlertsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  // Low stock uses the server filter (same threshold as the M11 scan). Expiry has no server filter,
  // so we fetch a page and keep on-hand items within the configured warning window.
  const lowStock = useStock({ lowStockOnly: true, take: 200 });
  const allStock = useStock({ take: 200 });
  const settings = useSystemSettings();
  const warningDays = settings.data?.expirationWarningDays ?? 30;

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
  const expiringRows = useMemo(
    () =>
      (allStock.data ?? []).filter(
        (r) => r.quantity > 0 && r.expirationDate != null && daysUntil(r.expirationDate) <= warningDays,
      ),
    [allStock.data, warningDays],
  );

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

  const expiryColumns = useMemo<ColumnDef<StockLevelResponse>[]>(
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
        accessorKey: "expirationDate",
        header: t("inventory.col.expiry"),
        cell: ({ row }) => (
          <span dir="ltr">
            {row.original.expirationDate ? formatDate(row.original.expirationDate, lang) : "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: t("inventory.col.status"),
        cell: ({ row }) => {
          const d = row.original.expirationDate ? daysUntil(row.original.expirationDate) : 0;
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
    [t, lang, locationLabel],
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
            isLoading={allStock.isLoading}
            emptyMessage={t("inventory.alerts.noExpiring")}
          />
        </section>
      </div>
    </AdminPage>
  );
}
