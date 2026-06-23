import { Money } from "@/components/ui/money";
import type { ColumnDef } from "@tanstack/react-table";
import { formatDate, VACCINE_CATEGORY, type ProductResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useDeleteProduct, useProducts } from "@/queries/products";
import { useAuthStore } from "@/stores/authStore";
import { VaccineFormDialog } from "@/routes/vaccinations/VaccineFormDialog";

/**
 * The vaccine catalog tab (اللقاحات, M26): products with category `vaccine` — purchased like any
 * product, FEFO-deducted when administered, and billed as a product line. CRUD mirrors the admin
 * products page (cost / selling price / expiry / reorder); mutations need `catalog.write`
 * server-side, so the actions are admin-only UX (RequireRole-style).
 */
export function VaccinesCatalogPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductResponse | null>(null);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [debouncedSearch, reset]);

  const query = useProducts({
    category: VACCINE_CATEGORY,
    search: debouncedSearch || undefined,
    skip,
    take,
  });
  const rows = query.data ?? [];
  const del = useDeleteProduct();

  const columns = useMemo<ColumnDef<ProductResponse>[]>(
    () => [
      {
        accessorKey: "nameAr",
        header: t("vaccinations.vaccines.col.nameAr"),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.nameAr}</div>
            {row.original.nameLatin ? (
              <div className="text-xs text-muted-foreground" dir="ltr">
                {row.original.nameLatin}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "purchasePrice",
        header: t("vaccinations.vaccines.col.cost"),
        cell: ({ row }) => <Money value={row.original.purchasePrice} />,
      },
      {
        accessorKey: "sellingPrice",
        header: t("vaccinations.vaccines.col.price"),
        cell: ({ row }) => <Money value={row.original.sellingPrice} />,
      },
      {
        accessorKey: "expirationDate",
        header: t("vaccinations.vaccines.col.expiry"),
        cell: ({ row }) =>
          row.original.expirationDate ? (
            <span dir="ltr">{formatDate(row.original.expirationDate, lang)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      ...(isAdmin
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }) => (
                <div className="flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t("admin.common.edit")}
                    onClick={() => {
                      setEditing(row.original);
                      setFormOpen(true);
                    }}
                  >
                    <Icon.edit className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t("admin.common.delete")}
                    onClick={() => setDeleteTarget(row.original)}
                  >
                    <Icon.trash className="size-4 text-destructive" />
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<ProductResponse>,
          ]
        : []),
    ],
    [t, lang, isAdmin],
  );

  const confirmDelete = () => {
    if (!deleteTarget) return;
    del.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t("admin.common.deleted"));
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          placeholder={t("vaccinations.vaccines.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {isAdmin ? (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Icon.plus className="size-4" />
            {t("vaccinations.vaccines.new")}
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        emptyMessage={t("vaccinations.vaccines.empty")}
      />
      <Pagination
        page={page + 1}
        canPrev={canPrev}
        canNext={rows.length === take}
        onPrev={prev}
        onNext={next}
      />

      <VaccineFormDialog open={formOpen} vaccine={editing} onClose={() => setFormOpen(false)} />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("vaccinations.vaccines.deleteTitle")}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("vaccinations.vaccines.deleteConfirm")}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={del.isPending}>
                {t("admin.common.cancel")}
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={del.isPending}>
                {t("admin.common.delete")}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
