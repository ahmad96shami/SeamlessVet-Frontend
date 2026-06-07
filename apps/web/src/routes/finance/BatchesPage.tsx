import type { ColumnDef } from "@tanstack/react-table";
import { BATCH_STATUS_VALUES, formatNumber, type BatchResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRange } from "@/components/ui/date-range";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useCustomerLookup } from "@/hooks/useCustomerLookup";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { cn } from "@/lib/utils";
import { useBatches, useDeleteBatch } from "@/queries/batches";
import { BatchFormDialog } from "@/routes/finance/BatchFormDialog";
import { batchStatusVariant } from "@/routes/finance/statusVariants";

export function BatchesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BatchResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BatchResponse | null>(null);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [status, reset]);

  const query = useBatches({ status: status || undefined, skip, take });
  const rows = query.data ?? [];
  const customers = useCustomerLookup();
  const doctors = useDoctorOptions();
  const del = useDeleteBatch();

  const resolveCustomerName = (id: string) => customers.byId.get(id)?.fullName;
  const customerName = (id: string) =>
    customers.byId.get(id)?.fullName ?? t("finance.unknownCustomer");
  const doctorName = (id: string | null | undefined) =>
    (id ? doctors.byId.get(id) : undefined) ?? "—";

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const columns = useMemo<ColumnDef<BatchResponse>[]>(
    () => [
      {
        accessorKey: "customerId",
        header: t("finance.batches.colCustomer"),
        cell: ({ row }) => <span className="font-medium">{customerName(row.original.customerId)}</span>,
      },
      {
        accessorKey: "responsibleDoctorId",
        header: t("finance.batches.colDoctor"),
        cell: ({ row }) => doctorName(row.original.responsibleDoctorId),
      },
      {
        accessorKey: "startDate",
        header: t("finance.batches.colPeriod"),
        cell: ({ row }) => (
          <DateRange
            start={row.original.startDate}
            end={row.original.endDate}
            className="text-sm"
          />
        ),
      },
      {
        accessorKey: "animalCount",
        header: t("finance.batches.colAnimals"),
        cell: ({ row }) => formatNumber(row.original.animalCount, lang),
      },
      {
        accessorKey: "supervisionFeeModel",
        header: t("finance.batches.colFee"),
        cell: ({ row }) => (
          <div>
            <div className="text-sm">{t(`feeModel.${row.original.supervisionFeeModel}`)}</div>
            <div className="text-end text-xs text-muted-foreground" dir="ltr">
              {formatNumber(row.original.supervisionFeeValue, lang)}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "doctorSharePercent",
        header: t("finance.batches.colShare"),
        cell: ({ row }) =>
          row.original.doctorSharePercent != null ? `${row.original.doctorSharePercent}%` : "—",
      },
      {
        accessorKey: "status",
        header: t("finance.batches.colStatus"),
        cell: ({ row }) =>
          row.original.settledAt ? (
            <Badge variant="success">{t("finance.settlement.settledBadge")}</Badge>
          ) : (
            <Badge variant={batchStatusVariant(row.original.status)}>
              {t(`batchStatus.${row.original.status}`, { defaultValue: row.original.status })}
            </Badge>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {/* M24 — settling (تصفية) is THE close path: re-price + discount + close + compute.
                Available until a settlement exists, even for batches closed via the old PATCH. */}
            {!row.original.settledAt ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/finance/batches/${row.original.id}/settle`)}
              >
                <Icon.receipt className="size-4" />
                {t("finance.settlement.action")}
              </Button>
            ) : null}
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
      },
    ],
    [t, lang, customers.byId, doctors.byId],
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("finance.batches.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("finance.batches.subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Icon.plus className="size-4" />
          {t("finance.batches.new")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn("chip", status === "" && "active")}
          onClick={() => setStatus("")}
        >
          {t("finance.all")}
        </button>
        {BATCH_STATUS_VALUES.map((s) => (
          <button
            key={s}
            type="button"
            className={cn("chip", status === s && "active")}
            onClick={() => setStatus(s)}
          >
            {t(`batchStatus.${s}`)}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        emptyMessage={t("finance.batches.empty")}
      />
      <Pagination
        page={page + 1}
        canPrev={canPrev}
        canNext={rows.length === take}
        onPrev={prev}
        onNext={next}
      />

      <BatchFormDialog
        open={formOpen}
        batch={editing}
        doctors={doctors.options}
        resolveCustomerName={resolveCustomerName}
        onClose={() => setFormOpen(false)}
      />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("finance.batches.deleteConfirm")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={del.isPending}>
              {t("admin.common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={del.isPending}>
              {t("admin.common.delete")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
