import type { ColumnDef } from "@tanstack/react-table";
import {
  CONTRACT_STATUS_VALUES,
  formatCurrency,
  formatDate,
  type ContractResponse,
} from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { useCustomerLookup } from "@/hooks/useCustomerLookup";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { cn } from "@/lib/utils";
import { useContracts } from "@/queries/contracts";
import { ContractDetailPanel } from "@/routes/finance/ContractDetailPanel";
import { ContractFormDialog } from "@/routes/finance/ContractFormDialog";
import { contractStatusVariant } from "@/routes/finance/statusVariants";

export function ContractsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContractResponse | null>(null);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [status, reset]);

  const query = useContracts({ status: status || undefined, skip, take });
  const rows = query.data ?? [];
  const customers = useCustomerLookup();
  const doctors = useDoctorOptions();

  const resolveCustomerName = (id: string) => customers.byId.get(id)?.fullName;
  const customerName = (id: string) =>
    customers.byId.get(id)?.fullName ?? t("finance.unknownCustomer");
  const doctorName = (id: string | null | undefined) =>
    (id ? doctors.byId.get(id) : undefined) ?? "—";

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const columns = useMemo<ColumnDef<ContractResponse>[]>(
    () => [
      {
        accessorKey: "customerId",
        header: t("finance.contracts.colCustomer"),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{customerName(row.original.customerId)}</div>
            {row.original.animalType ? (
              <div className="text-xs text-muted-foreground">{row.original.animalType}</div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "periodStart",
        header: t("finance.contracts.colPeriod"),
        cell: ({ row }) => (
          <span dir="ltr" className="text-sm">
            {formatDate(row.original.periodStart, lang)}
            {row.original.periodEnd ? ` → ${formatDate(row.original.periodEnd, lang)}` : ""}
          </span>
        ),
      },
      {
        accessorKey: "totalPrice",
        header: t("finance.contracts.colValue"),
        cell: ({ row }) =>
          row.original.totalPrice != null ? formatCurrency(row.original.totalPrice, lang) : "—",
      },
      {
        accessorKey: "expectedVisitCount",
        header: t("finance.contracts.colVisits"),
        cell: ({ row }) => row.original.expectedVisitCount ?? "—",
      },
      {
        accessorKey: "responsibleDoctorId",
        header: t("finance.contracts.colDoctor"),
        cell: ({ row }) => doctorName(row.original.responsibleDoctorId),
      },
      {
        accessorKey: "status",
        header: t("finance.contracts.colStatus"),
        cell: ({ row }) => (
          <Badge variant={contractStatusVariant(row.original.status)}>
            {t(`contractStatus.${row.original.status}`, { defaultValue: row.original.status })}
          </Badge>
        ),
      },
    ],
    [t, lang, customers.byId, doctors.byId],
  );

  const canEdit = selected && (selected.status === "draft" || selected.status === "active");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("finance.contracts.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("finance.contracts.subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Icon.plus className="size-4" />
          {t("finance.contracts.new")}
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
        {CONTRACT_STATUS_VALUES.map((s) => (
          <button
            key={s}
            type="button"
            className={cn("chip", status === s && "active")}
            onClick={() => setStatus(s)}
          >
            {t(`contractStatus.${s}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <DataTable
            columns={columns}
            data={rows}
            isLoading={query.isLoading}
            emptyMessage={t("finance.contracts.empty")}
            onRowClick={(row) => setSelectedId(row.id)}
          />
          <Pagination
            page={page + 1}
            canPrev={canPrev}
            canNext={rows.length === take}
            onPrev={prev}
            onNext={next}
          />
        </div>

        {selected ? (
          <ContractDetailPanel
            contract={selected}
            customerName={customerName(selected.customerId)}
            doctorName={doctorName(selected.responsibleDoctorId)}
            footer={
              canEdit ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEditing(selected);
                    setFormOpen(true);
                  }}
                >
                  <Icon.edit className="size-4" />
                  {t("admin.common.edit")}
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="hidden rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground lg:block">
            {t("finance.contracts.empty")}
          </div>
        )}
      </div>

      <ContractFormDialog
        open={formOpen}
        contract={editing}
        doctors={doctors.options}
        resolveCustomerName={resolveCustomerName}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}
