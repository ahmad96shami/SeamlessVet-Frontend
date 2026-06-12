import type { ColumnDef } from "@tanstack/react-table";
import { LEDGER_STATUS_VALUES, type DoctorPartnerResponse } from "@vet/shared";
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
import { DoctorPartnerFormDialog } from "@/routes/doctor-partners/DoctorPartnerFormDialog";
import { useDeleteDoctorPartner, useDoctorPartners } from "@/queries/doctorPartners";

export function DoctorPartnersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DoctorPartnerResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DoctorPartnerResponse | null>(null);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [debouncedSearch, status, reset]);

  const query = useDoctorPartners({
    search: debouncedSearch || undefined,
    ledgerStatus: status || undefined,
    skip,
    take,
  });
  const rows = query.data ?? [];
  const del = useDeleteDoctorPartner();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: DoctorPartnerResponse) => {
    setEditing(p);
    setFormOpen(true);
  };

  const columns = useMemo<ColumnDef<DoctorPartnerResponse>[]>(
    () => [
      {
        accessorKey: "doctorName",
        header: t("doctorPartners.colDoctor"),
        cell: ({ row }) => <div className="font-medium">{row.original.doctorName}</div>,
      },
      {
        accessorKey: "notes",
        header: t("doctorPartners.colNotes"),
        cell: ({ row }) =>
          row.original.notes ? (
            <span className="text-sm text-muted-foreground">{row.original.notes}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "balance",
        header: t("doctorPartners.colBalance"),
        cell: ({ row }) => (
          <span className={balanceClass(row.original.balance)} dir="ltr">
            <Money value={row.original.balance} />
          </span>
        ),
      },
      {
        accessorKey: "ledgerStatus",
        header: t("doctorPartners.colStatus"),
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
      title={t("doctorPartners.title")}
      description={t("doctorPartners.description")}
      actions={
        <Button onClick={openCreate}>
          <Icon.plus className="size-4" />
          {t("doctorPartners.new")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={t("doctorPartners.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} containerClassName="w-44">
            <option value="">{`${t("doctorPartners.filterStatus")}: ${t("admin.common.all")}`}</option>
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
          emptyMessage={t("doctorPartners.empty")}
          onRowClick={(p) => navigate(`/finance/doctor-partners/${p.id}`)}
        />
        <Pagination
          page={page + 1}
          canPrev={canPrev}
          canNext={rows.length === take}
          onPrev={prev}
          onNext={next}
        />
      </div>

      <DoctorPartnerFormDialog open={formOpen} partner={editing} onClose={() => setFormOpen(false)} />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("doctorPartners.deleteConfirm", { name: deleteTarget.doctorName })}
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
