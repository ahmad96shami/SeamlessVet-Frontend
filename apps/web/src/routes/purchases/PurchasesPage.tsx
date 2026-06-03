import type { ColumnDef } from "@tanstack/react-table";
import { formatDate, formatNumber, type PurchaseInvoiceResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { AdminPage } from "@/components/layout/AdminPage";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { usePurchaseInvoices } from "@/queries/purchaseInvoices";
import { useSuppliers } from "@/queries/suppliers";
import { PurchaseFormDialog } from "@/routes/purchases/PurchaseFormDialog";

export function PurchasesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [supplierId, setSupplierId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [supplierId, reset]);

  const query = usePurchaseInvoices({ supplierId: supplierId || undefined, skip, take });
  const rows = query.data ?? [];

  const suppliers = useSuppliers({ take: 200 });
  const supplierById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of suppliers.data ?? []) m.set(s.id, s.name);
    return m;
  }, [suppliers.data]);

  const columns = useMemo<ColumnDef<PurchaseInvoiceResponse>[]>(
    () => [
      {
        accessorKey: "number",
        header: t("purchases.colNumber"),
        cell: ({ row }) =>
          row.original.number ? (
            <span className="font-mono text-xs" dir="ltr">
              {row.original.number}
            </span>
          ) : (
            <span className="font-mono text-xs text-muted-foreground" dir="ltr">
              #{row.original.id.slice(0, 8)}
            </span>
          ),
      },
      {
        id: "supplier",
        header: t("purchases.colSupplier"),
        cell: ({ row }) => (
          <span className="font-medium">
            {supplierById.get(row.original.supplierId) ?? <span className="text-muted-foreground">—</span>}
          </span>
        ),
      },
      {
        accessorKey: "receivedAt",
        header: t("purchases.colDate"),
        cell: ({ row }) => (
          <span dir="ltr">{formatDate(row.original.receivedAt, lang)}</span>
        ),
      },
      {
        id: "items",
        header: t("purchases.colItems"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {t("purchases.itemsCount", { count: formatNumber(row.original.items.length, lang) })}
          </span>
        ),
      },
      {
        accessorKey: "total",
        header: t("purchases.colTotal"),
        cell: ({ row }) => (
          <span className="font-medium" dir="ltr">
            <Money value={row.original.total} symbolPlacement="leading" />
          </span>
        ),
      },
    ],
    [t, lang, supplierById],
  );

  return (
    <AdminPage
      title={t("purchases.title")}
      description={t("purchases.description")}
      actions={
        <Button onClick={() => setFormOpen(true)}>
          <Icon.plus className="size-4" />
          {t("purchases.new")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            containerClassName="w-56"
          >
            <option value="">{t("purchases.allSuppliers")}</option>
            {(suppliers.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          emptyMessage={t("purchases.empty")}
        />
        <Pagination
          page={page + 1}
          canPrev={canPrev}
          canNext={rows.length === take}
          onPrev={prev}
          onNext={next}
        />
      </div>

      <PurchaseFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </AdminPage>
  );
}
