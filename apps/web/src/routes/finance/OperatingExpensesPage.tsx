import type { ColumnDef } from "@tanstack/react-table";
import {
  formatDate,
  OPERATING_EXPENSE_CATEGORY_VALUES,
  type OperatingExpenseResponse,
} from "@vet/shared";
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
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import {
  useDeleteOperatingExpense,
  useOperatingExpenses,
} from "@/queries/operatingExpenses";
import { OperatingExpenseFormDialog } from "@/routes/finance/OperatingExpenseFormDialog";

export function OperatingExpensesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [category, setCategory] = useState("");
  const [paid, setPaid] = useState(""); // "", "true", "false"
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OperatingExpenseResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OperatingExpenseResponse | null>(null);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [category, paid, reset]);

  const query = useOperatingExpenses({
    category: category || undefined,
    paid: paid === "" ? undefined : paid === "true",
    skip,
    take,
  });
  const rows = query.data ?? [];
  const del = useDeleteOperatingExpense();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (e: OperatingExpenseResponse) => {
    setEditing(e);
    setFormOpen(true);
  };

  const columns = useMemo<ColumnDef<OperatingExpenseResponse>[]>(
    () => [
      {
        accessorKey: "incurredOn",
        header: t("operatingExpenses.colDate"),
        cell: ({ row }) => <span dir="ltr">{formatDate(row.original.incurredOn, lang)}</span>,
      },
      {
        accessorKey: "category",
        header: t("operatingExpenses.colCategory"),
        cell: ({ row }) =>
          t(`operatingExpenseCategory.${row.original.category}`, {
            defaultValue: row.original.category,
          }),
      },
      {
        accessorKey: "amount",
        header: t("operatingExpenses.colAmount"),
        cell: ({ row }) => (
          <span dir="ltr">
            <Money value={row.original.amount} />
          </span>
        ),
      },
      {
        accessorKey: "paid",
        header: t("operatingExpenses.colStatus"),
        cell: ({ row }) => (
          <Badge variant={row.original.paid ? "success" : "warning"}>
            {t(row.original.paid ? "operatingExpenses.statusPaid" : "operatingExpenses.statusUnpaid")}
          </Badge>
        ),
      },
      {
        accessorKey: "note",
        header: t("operatingExpenses.colNote"),
        cell: ({ row }) =>
          row.original.note ? (
            <span className="text-sm text-muted-foreground">{row.original.note}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
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
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <AdminPage
      title={t("operatingExpenses.title")}
      description={t("operatingExpenses.description")}
      actions={
        <Button onClick={openCreate}>
          <Icon.plus className="size-4" />
          {t("operatingExpenses.new")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} containerClassName="w-48">
            <option value="">{`${t("operatingExpenses.category")}: ${t("admin.common.all")}`}</option>
            {OPERATING_EXPENSE_CATEGORY_VALUES.map((c) => (
              <option key={c} value={c}>
                {t(`operatingExpenseCategory.${c}`)}
              </option>
            ))}
          </Select>
          <Select value={paid} onChange={(e) => setPaid(e.target.value)} containerClassName="w-44">
            <option value="">{`${t("operatingExpenses.colStatus")}: ${t("admin.common.all")}`}</option>
            <option value="true">{t("operatingExpenses.statusPaid")}</option>
            <option value="false">{t("operatingExpenses.statusUnpaid")}</option>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          emptyMessage={t("operatingExpenses.empty")}
        />
        <Pagination
          page={page + 1}
          canPrev={canPrev}
          canNext={rows.length === take}
          onPrev={prev}
          onNext={next}
        />
      </div>

      <OperatingExpenseFormDialog open={formOpen} expense={editing} onClose={() => setFormOpen(false)} />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("operatingExpenses.deleteConfirm")}</p>
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
