import { Money } from "@/components/ui/money";
import type { ColumnDef } from "@tanstack/react-table";
import { formatCurrency, type ServiceResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { AdminPage } from "@/components/layout/AdminPage";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useDeleteService, useServices } from "@/queries/services";
import { ServiceFormDialog } from "@/routes/admin/ServiceFormDialog";

export function ServicesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceResponse | null>(null);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [debouncedSearch, reset]);

  const query = useServices({ search: debouncedSearch || undefined, skip, take });
  const rows = query.data ?? [];
  const del = useDeleteService();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (s: ServiceResponse) => {
    setEditing(s);
    setFormOpen(true);
  };

  const columns = useMemo<ColumnDef<ServiceResponse>[]>(
    () => [
      {
        accessorKey: "nameAr",
        header: t("admin.services.colName"),
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
        header: t("admin.services.colCategory"),
        cell: ({ row }) => row.original.category ?? "—",
      },
      {
        accessorKey: "defaultPrice",
        header: t("admin.services.colPrice"),
        cell: ({ row }) => <Money value={row.original.defaultPrice} />,
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
      title={t("admin.services.title")}
      description={t("admin.services.description")}
      actions={
        <Button onClick={openCreate}>
          <Icon.plus className="size-4" />
          {t("admin.services.new")}
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          placeholder={t("admin.services.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />

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

      <ServiceFormDialog open={formOpen} service={editing} onClose={() => setFormOpen(false)} />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("admin.services.deleteConfirm", { name: deleteTarget.nameAr })}
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
