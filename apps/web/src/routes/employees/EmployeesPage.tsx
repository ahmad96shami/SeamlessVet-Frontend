import type { ColumnDef } from "@tanstack/react-table";
import { LEDGER_STATUS_VALUES, type EmployeeResponse } from "@vet/shared";
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
import { EmployeeFormDialog } from "@/routes/employees/EmployeeFormDialog";
import { useDeleteEmployee, useEmployees } from "@/queries/employees";

export function EmployeesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState("");
  const [active, setActive] = useState(""); // "" = all, "true" / "false"
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeResponse | null>(null);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [debouncedSearch, status, active, reset]);

  const query = useEmployees({
    search: debouncedSearch || undefined,
    ledgerStatus: status || undefined,
    active: active === "" ? undefined : active === "true",
    skip,
    take,
  });
  const rows = query.data ?? [];
  const del = useDeleteEmployee();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (e: EmployeeResponse) => {
    setEditing(e);
    setFormOpen(true);
  };

  const columns = useMemo<ColumnDef<EmployeeResponse>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: t("employees.colName"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.fullName}</span>
            {row.original.active ? null : (
              <Badge variant="secondary">{t("employees.activeNo")}</Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: "jobTitle",
        header: t("employees.colJobTitle"),
        cell: ({ row }) =>
          row.original.jobTitle ? (
            <span className="text-sm text-muted-foreground">{row.original.jobTitle}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "monthlySalary",
        header: t("employees.colSalary"),
        cell: ({ row }) => (
          <span dir="ltr">
            <Money value={row.original.monthlySalary} />
          </span>
        ),
      },
      {
        accessorKey: "balance",
        header: t("employees.colBalance"),
        cell: ({ row }) => (
          <span className={balanceClass(row.original.balance)} dir="ltr">
            <Money value={row.original.balance} />
          </span>
        ),
      },
      {
        accessorKey: "ledgerStatus",
        header: t("employees.colStatus"),
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.ledgerStatus)}>
            {t(`ledgerStatus.${row.original.ledgerStatus}`, {
              defaultValue: row.original.ledgerStatus,
            })}
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
      title={t("employees.title")}
      description={t("employees.description")}
      actions={
        <Button onClick={openCreate}>
          <Icon.plus className="size-4" />
          {t("employees.new")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={t("employees.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            containerClassName="w-44"
          >
            <option value="">{`${t("employees.filterStatus")}: ${t("admin.common.all")}`}</option>
            {LEDGER_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {t(`ledgerStatus.${s}`)}
              </option>
            ))}
          </Select>
          <Select
            value={active}
            onChange={(e) => setActive(e.target.value)}
            containerClassName="w-44"
          >
            <option value="">{`${t("employees.filterActive")}: ${t("admin.common.all")}`}</option>
            <option value="true">{t("employees.activeYes")}</option>
            <option value="false">{t("employees.activeNo")}</option>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          emptyMessage={t("employees.empty")}
          onRowClick={(e) => navigate(`/finance/employees/${e.id}`)}
        />
        <Pagination
          page={page + 1}
          canPrev={canPrev}
          canNext={rows.length === take}
          onPrev={prev}
          onNext={next}
        />
      </div>

      <EmployeeFormDialog open={formOpen} employee={editing} onClose={() => setFormOpen(false)} />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("employees.deleteConfirm", { name: deleteTarget.fullName })}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={del.isPending}
              >
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
