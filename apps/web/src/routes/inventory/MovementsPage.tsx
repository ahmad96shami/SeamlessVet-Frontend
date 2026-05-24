import type { ColumnDef } from "@tanstack/react-table";
import {
  formatDateTime,
  formatQuantity,
  MOVEMENT_TYPE_VALUES,
  type InventoryMovementResponse,
} from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { AdminPage } from "@/components/layout/AdminPage";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useFieldInventories, useMovements } from "@/queries/inventory";
import { useProducts } from "@/queries/products";
import { InventoryTabs } from "@/routes/inventory/InventoryTabs";

export function MovementsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [movementType, setMovementType] = useState("");
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [movementType, reset]);

  const query = useMovements({ movementType: movementType || undefined, skip, take });
  const rows = query.data ?? [];

  // Movements carry only ids; resolve product names + field-doctor names from cached reference data.
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
        cell: ({ row }) => (
          <span dir="ltr">{formatDateTime(row.original.createdAt, lang)}</span>
        ),
      },
      {
        accessorKey: "movementType",
        header: t("inventory.col.type"),
        cell: ({ row }) => (
          <Badge variant="secondary">
            {t(`inventory.movementType.${row.original.movementType}`, {
              defaultValue: row.original.movementType,
            })}
          </Badge>
        ),
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
          const resolve = (type?: string | null, id?: string | null) => {
            if (!type) return null;
            if (type === "field") return (id && doctorByLocation.get(id)) || t("inventory.location.field");
            return t("inventory.location.warehouse");
          };
          const from = resolve(row.original.fromLocationType, row.original.fromLocationId);
          const to = resolve(row.original.toLocationType, row.original.toLocationId);
          return (
            <span className="text-sm text-muted-foreground">{[from, to].filter(Boolean).join(" → ")}</span>
          );
        },
      },
      {
        accessorKey: "quantityDelta",
        header: t("inventory.col.change"),
        cell: ({ row }) => {
          const d = row.original.quantityDelta;
          return (
            <span className={d < 0 ? "font-medium text-destructive" : "font-medium"} dir="ltr">
              {d > 0 ? "+" : ""}
              {formatQuantity(d, lang)}
            </span>
          );
        },
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
      title={t("inventory.movements.title")}
      description={t("inventory.movements.description")}
    >
      <div className="space-y-4">
        <InventoryTabs />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
            containerClassName="w-56"
          >
            <option value="">{`${t("inventory.movements.filterType")}: ${t("admin.common.all")}`}</option>
            {MOVEMENT_TYPE_VALUES.map((mt) => (
              <option key={mt} value={mt}>
                {t(`inventory.movementType.${mt}`)}
              </option>
            ))}
          </Select>
        </div>
        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          emptyMessage={t("inventory.movements.empty")}
        />
        <Pagination
          page={page + 1}
          canPrev={canPrev}
          canNext={rows.length === take}
          onPrev={prev}
          onNext={next}
        />
      </div>
    </AdminPage>
  );
}
