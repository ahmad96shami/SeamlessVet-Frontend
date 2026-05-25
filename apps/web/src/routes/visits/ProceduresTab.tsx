import type { ColumnDef } from "@tanstack/react-table";
import { formatCurrency, type ProcedureResponse } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useDeleteProcedure, useProcedures } from "@/queries/procedures";
import { useServices } from "@/queries/services";
import { ProcedureFormDialog } from "@/routes/visits/ProcedureFormDialog";

/** Procedures performed during the visit (PRD §5.2-C). */
export function ProceduresTab({ visitId, readOnly }: { visitId: string; readOnly: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const query = useProcedures(visitId);
  const rows = query.data ?? [];
  const services = useServices({ take: 200 });
  const serviceById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of services.data ?? []) m.set(s.id, s.nameAr);
    return m;
  }, [services.data]);
  const del = useDeleteProcedure();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProcedureResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProcedureResponse | null>(null);

  const columns = useMemo<ColumnDef<ProcedureResponse>[]>(() => {
    const cols: ColumnDef<ProcedureResponse>[] = [
      {
        id: "service",
        header: t("visits.procedures.col.service"),
        cell: ({ row }) => {
          const id = row.original.serviceId;
          const name = id ? serviceById.get(id) : undefined;
          return name ?? <span className="text-muted-foreground">{t("visits.procedures.noService")}</span>;
        },
      },
      {
        accessorKey: "price",
        header: t("visits.procedures.col.price"),
        cell: ({ row }) => (
          <span dir="ltr">{formatCurrency(row.original.price, lang)}</span>
        ),
      },
      {
        accessorKey: "resultText",
        header: t("visits.procedures.col.result"),
        cell: ({ row }) =>
          row.original.resultText ? (
            <span className="block max-w-[22rem] truncate">{row.original.resultText}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ];
    if (!readOnly) {
      cols.push({
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
      });
    }
    return cols;
  }, [t, lang, serviceById, readOnly]);

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
    <section className="space-y-3">
      {!readOnly ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Icon.plus className="size-4" />
            {t("visits.procedures.add")}
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        emptyMessage={t("visits.procedures.empty")}
      />

      {formOpen ? (
        <ProcedureFormDialog
          open
          visitId={visitId}
          procedure={editing}
          onClose={() => setFormOpen(false)}
        />
      ) : null}

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("visits.procedures.deleteConfirm")}</p>
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
    </section>
  );
}
