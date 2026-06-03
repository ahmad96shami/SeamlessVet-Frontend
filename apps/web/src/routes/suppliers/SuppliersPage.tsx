import type { ColumnDef } from "@tanstack/react-table";
import { LEDGER_STATUS_VALUES, type SupplierResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { AdminPage } from "@/components/layout/AdminPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { balanceClass, statusVariant } from "@/routes/customers/ledgerStatus";
import { SupplierFormDialog } from "@/routes/suppliers/SupplierFormDialog";
import { useDeleteSupplier, useSuppliers } from "@/queries/suppliers";

export function SuppliersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierResponse | null>(null);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [debouncedSearch, status, reset]);

  const query = useSuppliers({
    search: debouncedSearch || undefined,
    ledgerStatus: status || undefined,
    skip,
    take,
  });
  const rows = query.data ?? [];
  const del = useDeleteSupplier();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (s: SupplierResponse) => {
    setEditing(s);
    setFormOpen(true);
  };

  const columns = useMemo<ColumnDef<SupplierResponse>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("suppliers.colName"),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            {row.original.phonePrimary ? (
              <div className="text-end text-xs text-muted-foreground" dir="ltr">
                {row.original.phonePrimary}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "contact",
        header: t("suppliers.colContact"),
        cell: ({ row }) => {
          const bits = [row.original.email, row.original.address].filter(Boolean) as string[];
          return bits.length ? (
            <span className="text-sm text-muted-foreground">{bits.join(" · ")}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "taxNumber",
        header: t("suppliers.colTaxNumber"),
        cell: ({ row }) =>
          row.original.taxNumber ? (
            <span className="font-mono text-xs" dir="ltr">
              {row.original.taxNumber}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "balance",
        header: t("suppliers.colBalance"),
        cell: ({ row }) => (
          <span className={balanceClass(row.original.balance)} dir="ltr">
            <Money value={row.original.balance} symbolPlacement="leading" />
          </span>
        ),
      },
      {
        accessorKey: "ledgerStatus",
        header: t("suppliers.colStatus"),
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.ledgerStatus)}>
            {t(`ledgerStatus.${row.original.ledgerStatus}`, { defaultValue: row.original.ledgerStatus })}
          </Badge>
        ),
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
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row.original);
              }}
            >
              <Icon.edit className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("admin.common.delete")}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row.original);
              }}
            >
              <Icon.trash className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [t],
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
      title={t("suppliers.title")}
      description={t("suppliers.description")}
      actions={
        <Button onClick={openCreate}>
          <Icon.plus className="size-4" />
          {t("suppliers.new")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={t("suppliers.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} containerClassName="w-44">
            <option value="">{`${t("suppliers.filterStatus")}: ${t("admin.common.all")}`}</option>
            {LEDGER_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {t(`ledgerStatus.${s}`)}
              </option>
            ))}
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          emptyMessage={t("suppliers.empty")}
          onRowClick={(s) => navigate(`/finance/suppliers/${s.id}`)}
        />
        <Pagination
          page={page + 1}
          canPrev={canPrev}
          canNext={rows.length === take}
          onPrev={prev}
          onNext={next}
        />
      </div>

      <SupplierFormDialog open={formOpen} supplier={editing} onClose={() => setFormOpen(false)} />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("suppliers.deleteConfirm", { name: deleteTarget.name })}
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
