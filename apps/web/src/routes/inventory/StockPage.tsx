import type { ColumnDef } from "@tanstack/react-table";
import {
  formatCurrency,
  formatDate,
  formatQuantity,
  STOCK_LOCATION_VALUES,
  type StockLevelResponse,
} from "@vet/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { AdminPage } from "@/components/layout/AdminPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useFieldInventories, useStock } from "@/queries/inventory";
import { AdjustStockDialog } from "@/routes/inventory/AdjustStockDialog";
import { ReceiveStockDialog } from "@/routes/inventory/ReceiveStockDialog";

/** True once today is past the expiration day (date-only comparison). */
function isExpired(date: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date) < today;
}

export function StockPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  // Default to the central warehouse — the design's primary stock view.
  const [locationType, setLocationType] = useState("warehouse");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<StockLevelResponse | null>(null);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [debouncedSearch, locationType, lowStockOnly, reset]);

  const query = useStock({
    search: debouncedSearch || undefined,
    locationType: locationType || undefined,
    lowStockOnly: lowStockOnly || undefined,
    skip,
    take,
  });
  const rows = query.data ?? [];

  // Field rows carry only the field-inventory id; resolve it to the owning doctor's name.
  const fieldInvs = useFieldInventories();
  const doctorByLocation = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of fieldInvs.data ?? []) map.set(f.id, f.doctorName);
    return map;
  }, [fieldInvs.data]);

  // Field rows show the owning doctor; warehouse rows the warehouse label. Shared by the location
  // column and the adjust dialog header.
  const locationLabel = useCallback(
    (r: StockLevelResponse) =>
      r.locationType === "field"
        ? (doctorByLocation.get(r.locationId) ?? t("inventory.location.field"))
        : t("inventory.location.warehouse"),
    [doctorByLocation, t],
  );

  const columns = useMemo<ColumnDef<StockLevelResponse>[]>(
    () => [
      {
        accessorKey: "nameAr",
        header: t("inventory.col.product"),
        cell: ({ row }) => {
          const sub = [row.original.nameLatin, row.original.barcode].filter(Boolean).join(" · ");
          return (
            <div>
              <div className="font-medium">{row.original.nameAr}</div>
              {sub ? (
                <div className="text-xs text-muted-foreground" dir="ltr">
                  {sub}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: t("inventory.col.category"),
        cell: ({ row }) => (
          <Badge variant="secondary">
            {t(`productCategory.${row.original.category}`, { defaultValue: row.original.category })}
          </Badge>
        ),
      },
      {
        id: "location",
        header: t("inventory.col.location"),
        cell: ({ row }) => locationLabel(row.original),
      },
      {
        accessorKey: "quantity",
        header: t("inventory.col.quantity"),
        cell: ({ row }) => (
          <span className={row.original.quantity <= 0 ? "font-medium text-destructive" : "font-medium"}>
            {formatQuantity(row.original.quantity, lang)}
            {row.original.unitOfMeasure ? (
              <span className="text-xs text-muted-foreground"> {row.original.unitOfMeasure}</span>
            ) : null}
          </span>
        ),
      },
      {
        accessorKey: "reorderPoint",
        header: t("inventory.col.reorderPoint"),
        cell: ({ row }) => formatQuantity(row.original.reorderPoint, lang),
      },
      {
        accessorKey: "expirationDate",
        header: t("inventory.col.expiry"),
        cell: ({ row }) => {
          const d = row.original.expirationDate;
          if (!d) return <span className="text-muted-foreground">—</span>;
          return (
            <span className={isExpired(d) ? "text-destructive" : ""} dir="ltr">
              {formatDate(d, lang)}
            </span>
          );
        },
      },
      {
        accessorKey: "sellingPrice",
        header: t("inventory.col.sellingPrice"),
        cell: ({ row }) => formatCurrency(row.original.sellingPrice, lang),
      },
      {
        id: "status",
        header: t("inventory.col.status"),
        cell: ({ row }) => {
          const r = row.original;
          if (r.quantity <= 0) return <Badge variant="destructive">{t("inventory.status.out")}</Badge>;
          if (r.belowReorderPoint) return <Badge variant="warning">{t("inventory.status.low")}</Badge>;
          return <Badge variant="success">{t("inventory.status.ok")}</Badge>;
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("inventory.adjust.action")}
              onClick={() => setAdjustTarget(row.original)}
            >
              <Icon.edit className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t, lang, locationLabel],
  );

  return (
    <AdminPage
      title={t("inventory.title")}
      description={t("inventory.description")}
      actions={
        <Button onClick={() => setReceiveOpen(true)}>
          <Icon.plus className="size-4" />
          {t("inventory.receive.action")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={t("inventory.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            containerClassName="w-48"
          >
            <option value="">{`${t("inventory.filterLocation")}: ${t("inventory.location.all")}`}</option>
            {STOCK_LOCATION_VALUES.map((loc) => (
              <option key={loc} value={loc}>
                {t(`inventory.location.${loc}`)}
              </option>
            ))}
          </Select>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Switch checked={lowStockOnly} onCheckedChange={setLowStockOnly} />
            {t("inventory.lowStockOnly")}
          </label>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          emptyMessage={t("inventory.empty")}
        />
        <Pagination
          page={page + 1}
          canPrev={canPrev}
          canNext={rows.length === take}
          onPrev={prev}
          onNext={next}
        />
      </div>

      <ReceiveStockDialog open={receiveOpen} onClose={() => setReceiveOpen(false)} />
      <AdjustStockDialog
        stockItem={adjustTarget}
        locationLabel={adjustTarget ? locationLabel(adjustTarget) : ""}
        onClose={() => setAdjustTarget(null)}
      />
    </AdminPage>
  );
}
