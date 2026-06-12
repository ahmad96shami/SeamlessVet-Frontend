import type { ColumnDef } from "@tanstack/react-table";
import { formatDateTime, formatQuantity, type InventoryMovementResponse } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { AdminPage } from "@/components/layout/AdminPage";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useFieldInventories, useMovements } from "@/queries/inventory";
import { useProducts } from "@/queries/products";
import { ConsumeStockDialog } from "@/routes/inventory/ConsumeStockDialog";
import { InventoryTabs } from "@/routes/inventory/InventoryTabs";

/**
 * The المستهلكات screen (M27): record internal use of consumable stock and review the consumption
 * history (the `consume` movements). Recording deducts stock (FEFO) server-side; the report tab on
 * /reports sums it by (location, product) with cost.
 */
export function ConsumablesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [recordOpen, setRecordOpen] = useState(false);
  const { page, skip, take, canPrev, next, prev } = useOffsetPager(20);

  const query = useMovements({ movementType: "consume", skip, take });
  const rows = query.data ?? [];

  // Movements carry only ids — resolve product + field-doctor names from cached reference data.
  const products = useProducts({ take: 200 });
  const productName = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products.data ?? []) map.set(p.id, p.nameAr);
    return map;
  }, [products.data]);

  const fieldInvs = useFieldInventories();
  const doctorByLocation = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of fieldInvs.data ?? []) map.set(f.id, f.doctorName);
    return map;
  }, [fieldInvs.data]);

  const columns = useMemo<ColumnDef<InventoryMovementResponse>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: t("inventory.col.date"),
        cell: ({ row }) => <span dir="ltr">{formatDateTime(row.original.createdAt, lang)}</span>,
      },
      {
        accessorKey: "productId",
        header: t("inventory.col.product"),
        cell: ({ row }) => productName.get(row.original.productId) ?? "—",
      },
      {
        id: "location",
        header: t("inventory.col.location"),
        cell: ({ row }) => {
          const type = row.original.fromLocationType;
          const id = row.original.fromLocationId;
          const label = !type
            ? "—"
            : type === "field"
              ? (id && doctorByLocation.get(id)) || t("inventory.location.field")
              : t("inventory.location.warehouse");
          return <span className="text-sm text-muted-foreground">{label}</span>;
        },
      },
      {
        accessorKey: "quantityDelta",
        header: t("inventory.consumables.quantity"),
        // The consumed magnitude — a consume leg is a negative delta; show it positive.
        cell: ({ row }) => (
          <span className="font-medium tabular-nums" dir="ltr">
            {formatQuantity(-row.original.quantityDelta, lang)}
          </span>
        ),
      },
      {
        accessorKey: "reason",
        header: t("inventory.col.reason"),
        cell: ({ row }) => row.original.reason ?? "—",
      },
    ],
    [t, lang, productName, doctorByLocation],
  );

  return (
    <AdminPage
      title={t("inventory.consumables.title")}
      description={t("inventory.consumables.description")}
      actions={
        <Button onClick={() => setRecordOpen(true)}>
          <Icon.plus className="size-4" />
          {t("inventory.consumables.recordAction")}
        </Button>
      }
    >
      <div className="space-y-4">
        <InventoryTabs />
        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          emptyMessage={t("inventory.consumables.empty")}
        />
        <Pagination
          page={page + 1}
          canPrev={canPrev}
          canNext={rows.length === take}
          onPrev={prev}
          onNext={next}
        />
      </div>

      <ConsumeStockDialog open={recordOpen} onClose={() => setRecordOpen(false)} />
    </AdminPage>
  );
}
