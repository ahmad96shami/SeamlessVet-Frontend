import type { ColumnDef } from "@tanstack/react-table";
import { formatCurrency, PRODUCT_CATEGORY_VALUES, type ProductResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { AdminPage } from "@/components/layout/AdminPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useDeleteProduct, useProducts } from "@/queries/products";
import { ProductFormDialog } from "@/routes/admin/ProductFormDialog";

export function ProductsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [category, setCategory] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductResponse | null>(null);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [debouncedSearch, category, reset]);

  const query = useProducts({
    search: debouncedSearch || undefined,
    category: category || undefined,
    skip,
    take,
  });
  const rows = query.data ?? [];
  const del = useDeleteProduct();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: ProductResponse) => {
    setEditing(p);
    setFormOpen(true);
  };

  const columns = useMemo<ColumnDef<ProductResponse>[]>(
    () => [
      {
        accessorKey: "nameAr",
        header: t("admin.products.colName"),
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
        accessorKey: "category",
        header: t("admin.products.colCategory"),
        cell: ({ row }) => (
          <Badge variant="secondary">
            {t(`productCategory.${row.original.category}`, { defaultValue: row.original.category })}
          </Badge>
        ),
      },
      {
        accessorKey: "barcode",
        header: t("admin.products.colBarcode"),
        cell: ({ row }) => <span dir="ltr">{row.original.barcode ?? "—"}</span>,
      },
      {
        accessorKey: "sellingPrice",
        header: t("admin.products.colSellingPrice"),
        cell: ({ row }) => formatCurrency(row.original.sellingPrice, lang),
      },
      {
        accessorKey: "reorderPoint",
        header: t("admin.products.colReorder"),
        cell: ({ row }) => row.original.reorderPoint,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("admin.common.edit")}
              onClick={() => openEdit(row.original)}
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
      },
    ],
    [t, lang],
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
    <AdminPage
      title={t("admin.products.title")}
      description={t("admin.products.description")}
      actions={
        <Button onClick={openCreate}>
          <Icon.plus className="size-4" />
          {t("admin.products.new")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={t("admin.products.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            containerClassName="w-48"
          >
            <option value="">{`${t("admin.products.filterCategory")}: ${t("admin.common.all")}`}</option>
            {PRODUCT_CATEGORY_VALUES.map((c) => (
              <option key={c} value={c}>
                {t(`productCategory.${c}`)}
              </option>
            ))}
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          emptyMessage={t("admin.common.noResults")}
        />
        <Pagination
          page={page + 1}
          canPrev={canPrev}
          canNext={rows.length === take}
          onPrev={prev}
          onNext={next}
        />
      </div>

      <ProductFormDialog open={formOpen} product={editing} onClose={() => setFormOpen(false)} />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("admin.products.deleteConfirm", { name: deleteTarget.nameAr })}
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
    </AdminPage>
  );
}
