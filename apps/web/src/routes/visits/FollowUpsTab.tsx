import type { ColumnDef } from "@tanstack/react-table";
import { formatDate, formatNumber, type DailyFollowUpResponse, type VisitResponse } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useDailyFollowUps, useDeleteDailyFollowUp } from "@/queries/dailyFollowUps";
import { FollowUpFormDialog } from "@/routes/visits/FollowUpFormDialog";

/** Daily follow-ups (PRD §5.2-E) — clinic-only (the API rejects them on field visits). */
export function FollowUpsTab({ visit, readOnly }: { visit: VisitResponse; readOnly: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isClinic = visit.visitType === "in_clinic";
  const query = useDailyFollowUps(isClinic ? visit.id : null);
  const rows = query.data ?? [];
  const del = useDeleteDailyFollowUp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DailyFollowUpResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DailyFollowUpResponse | null>(null);

  const columns = useMemo<ColumnDef<DailyFollowUpResponse>[]>(() => {
    const vital = (n: number | null | undefined) => (n != null ? formatNumber(n, lang) : "—");
    const cols: ColumnDef<DailyFollowUpResponse>[] = [
      {
        accessorKey: "entryDate",
        header: t("visits.followups.col.date"),
        cell: ({ row }) => <span dir="ltr">{formatDate(row.original.entryDate, lang)}</span>,
      },
      {
        accessorKey: "condition",
        header: t("visits.followups.col.condition"),
        cell: ({ row }) => row.original.condition ?? <span className="text-muted-foreground">—</span>,
      },
      {
        id: "vitals",
        header: t("visits.followups.col.vitals"),
        cell: ({ row }) => (
          <span dir="ltr" className="text-sm text-muted-foreground">
            {vital(row.original.temperature)}° · {vital(row.original.heartRate)} · {vital(row.original.respiratoryRate)}
          </span>
        ),
      },
      {
        accessorKey: "administeredMeds",
        header: t("visits.followups.col.meds"),
        cell: ({ row }) =>
          row.original.administeredMeds ? (
            <span className="block max-w-[16rem] truncate">{row.original.administeredMeds}</span>
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
            <Button size="icon" variant="ghost" aria-label={t("admin.common.edit")} onClick={() => { setEditing(row.original); setFormOpen(true); }}>
              <Icon.edit className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label={t("admin.common.delete")} onClick={() => setDeleteTarget(row.original)}>
              <Icon.trash className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      });
    }
    return cols;
  }, [t, lang, readOnly]);

  if (!isClinic) {
    return (
      <div className="rounded-xl border bg-[var(--paper-soft)] p-3 text-sm text-muted-foreground">
        {t("visits.followups.clinicOnly")}
      </div>
    );
  }

  const confirmDelete = () => {
    if (!deleteTarget) return;
    del.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success(t("admin.common.deleted")); setDeleteTarget(null); },
    });
  };

  return (
    <section className="space-y-3">
      {!readOnly ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Icon.plus className="size-4" />
            {t("visits.followups.add")}
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        emptyMessage={t("visits.followups.empty")}
      />

      {formOpen ? (
        <FollowUpFormDialog open visitId={visit.id} followUp={editing} onClose={() => setFormOpen(false)} />
      ) : null}

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title={t("admin.common.deleteConfirmTitle")}>
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("visits.followups.deleteConfirm")}</p>
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
