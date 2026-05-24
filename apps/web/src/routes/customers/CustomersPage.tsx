import type { ColumnDef } from "@tanstack/react-table";
import {
  CUSTOMER_TYPE_VALUES,
  formatCurrency,
  LEDGER_STATUS_VALUES,
  type CustomerResponse,
} from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { AdminPage } from "@/components/layout/AdminPage";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useCustomers, useDeleteCustomer } from "@/queries/customers";
import { useFieldInventories } from "@/queries/inventory";
import { CustomerFormDialog } from "@/routes/customers/CustomerFormDialog";

function statusVariant(status: string): BadgeProps["variant"] {
  if (status === "has_debt") return "warning";
  if (status === "closed") return "success";
  return "default"; // open
}

export function CustomersPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [type, setType] = useState("");
  const [doctor, setDoctor] = useState("");
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerResponse | null>(null);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [debouncedSearch, type, doctor, status, reset]);

  const query = useCustomers({
    search: debouncedSearch || undefined,
    type: type || undefined,
    assignedDoctorId: doctor || undefined,
    ledgerStatus: status || undefined,
    skip,
    take,
  });
  const rows = query.data ?? [];
  const del = useDeleteCustomer();

  // assigned_doctor_id is a user id; resolve it to a name via the field-inventories picker (the
  // authenticated doctor source). Also powers the doctor filter dropdown.
  const fieldInvs = useFieldInventories();
  const doctorById = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of fieldInvs.data ?? []) m.set(f.doctorId, f.doctorName);
    return m;
  }, [fieldInvs.data]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (c: CustomerResponse) => {
    setEditing(c);
    setFormOpen(true);
  };

  const columns = useMemo<ColumnDef<CustomerResponse>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: t("customers.colName"),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.fullName}</div>
            {row.original.phonePrimary ? (
              <div className="text-xs text-muted-foreground" dir="ltr">
                {row.original.phonePrimary}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: t("customers.colType"),
        cell: ({ row }) => (
          <Badge variant="secondary">
            {t(`customerType.${row.original.type}`, { defaultValue: row.original.type })}
          </Badge>
        ),
      },
      {
        id: "doctor",
        header: t("customers.colDoctor"),
        cell: ({ row }) => {
          const id = row.original.assignedDoctorId;
          if (!id) return <span className="text-muted-foreground">—</span>;
          return doctorById.get(id) ?? <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: "balance",
        header: t("customers.colBalance"),
        cell: ({ row }) => {
          const b = row.original.balance;
          const cls =
            b > 0 ? "font-medium text-destructive" : b < 0 ? "font-medium text-success" : "text-muted-foreground";
          return (
            <span className={cls} dir="ltr">
              {formatCurrency(b, lang)}
            </span>
          );
        },
      },
      {
        accessorKey: "ledgerStatus",
        header: t("customers.colStatus"),
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
    [t, lang, doctorById],
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
      title={t("customers.title")}
      description={t("customers.description")}
      actions={
        <Button onClick={openCreate}>
          <Icon.plus className="size-4" />
          {t("customers.new")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={t("customers.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={type} onChange={(e) => setType(e.target.value)} containerClassName="w-44">
            <option value="">{`${t("customers.filterType")}: ${t("admin.common.all")}`}</option>
            {CUSTOMER_TYPE_VALUES.map((ct) => (
              <option key={ct} value={ct}>
                {t(`customerType.${ct}`)}
              </option>
            ))}
          </Select>
          <Select value={doctor} onChange={(e) => setDoctor(e.target.value)} containerClassName="w-48">
            <option value="">{`${t("customers.filterDoctor")}: ${t("admin.common.all")}`}</option>
            {(fieldInvs.data ?? []).map((d) => (
              <option key={d.doctorId} value={d.doctorId}>
                {d.doctorName}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} containerClassName="w-44">
            <option value="">{`${t("customers.filterStatus")}: ${t("admin.common.all")}`}</option>
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
          emptyMessage={t("customers.empty")}
          onRowClick={(c) => navigate(`/operations/customers/${c.id}`)}
        />
        <Pagination
          page={page + 1}
          canPrev={canPrev}
          canNext={rows.length === take}
          onPrev={prev}
          onNext={next}
        />
      </div>

      <CustomerFormDialog open={formOpen} customer={editing} onClose={() => setFormOpen(false)} />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("customers.deleteConfirm", { name: deleteTarget.fullName })}
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
