import type { ColumnDef } from "@tanstack/react-table";
import {
  formatDate,
  formatQuantity,
  type InventoryLot,
  type StockLevelResponse,
} from "@vet/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/data-table/DataTable";
import { Dialog } from "@/components/ui/dialog";
import { Money } from "@/components/ui/money";
import { useInventoryLots } from "@/queries/inventory";

/**
 * W16.3 — the per-lot view of one (product, location) stock row, opened from the stock list. Lists
 * the on-hand FEFO lots (cost + expiry + remaining), earliest-expiry first — the same order
 * consumption draws them, so the top row is what the next sale will deduct.
 */
export function LotsDialog({
  stockItem,
  locationLabel,
  onClose,
}: {
  stockItem: StockLevelResponse | null;
  locationLabel: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const query = useInventoryLots(
    {
      productId: stockItem?.productId ?? "",
      locationType: stockItem?.locationType,
      locationId: stockItem?.locationId,
      onHandOnly: true,
    },
    stockItem !== null,
  );
  const rows = query.data ?? [];

  const columns = useMemo<ColumnDef<InventoryLot>[]>(
    () => [
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
        cell: ({ row }) =>
          row.original.expirationDate ? (
            <span dir="ltr">{formatDate(row.original.expirationDate, lang)}</span>
          ) : (
            <span className="text-muted-foreground">{t("inventory.lots.noExpiry")}</span>
          ),
      },
      {
        accessorKey: "remainingQty",
        header: t("inventory.col.remaining"),
        cell: ({ row }) => <span className="font-medium">{formatQuantity(row.original.remainingQty, lang)}</span>,
      },
      {
        accessorKey: "unitCost",
        header: t("inventory.col.unitCost"),
        cell: ({ row }) => <Money value={row.original.unitCost} />,
      },
      {
        accessorKey: "receivedAt",
        header: t("inventory.col.received"),
        cell: ({ row }) => (
          <span dir="ltr">{formatDate(row.original.receivedAt, lang)}</span>
        ),
      },
    ],
    [t, lang],
  );

  return (
    <Dialog
      open={stockItem !== null}
      onClose={onClose}
      title={t("inventory.lots.dialogTitle", { product: stockItem?.nameAr ?? "" })}
      className="max-w-2xl"
    >
      {stockItem ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {locationLabel} — {t("inventory.lots.dialogDescription")}
          </p>
          <DataTable
            columns={columns}
            data={rows}
            isLoading={query.isLoading}
            emptyMessage={t("inventory.lots.empty")}
          />
        </div>
      ) : null}
    </Dialog>
  );
}
