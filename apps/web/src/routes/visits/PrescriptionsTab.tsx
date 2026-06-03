import type { ColumnDef } from "@tanstack/react-table";
import { formatQuantity, type PrescriptionResponse } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useProducts } from "@/queries/products";
import { useDeletePrescription, usePrescriptions } from "@/queries/prescriptions";
import { PrescriptionFormDialog } from "@/routes/visits/PrescriptionFormDialog";

/** Prescriptions on the visit (PRD §5.2-D) — the dispense-type split is shown as a pill. */
export function PrescriptionsTab({ visitId, readOnly }: { visitId: string; readOnly: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const query = usePrescriptions(visitId);
  const rows = query.data ?? [];
  const products = useProducts({ take: 200 });
  const productById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products.data ?? []) m.set(p.id, p.nameAr);
    return m;
  }, [products.data]);
  const del = useDeletePrescription();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PrescriptionResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PrescriptionResponse | null>(null);

  const columns = useMemo<ColumnDef<PrescriptionResponse>[]>(() => {
    const cols: ColumnDef<PrescriptionResponse>[] = [
      {
        id: "product",
        header: t("visits.prescriptions.col.product"),
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="font-medium">{productById.get(row.original.productId) ?? "—"}</span>
            {row.original.reminderEnabled ? (
              <Badge variant="warning">{t("visits.prescriptions.recurring.badge")}</Badge>
            ) : null}
          </span>
        ),
      },
      {
        accessorKey: "dosage",
        header: t("visits.prescriptions.col.dosage"),
        cell: ({ row }) => row.original.dosage ?? <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: "frequency",
        header: t("visits.prescriptions.col.frequency"),
        cell: ({ row }) => row.original.frequency ?? <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: "duration",
        header: t("visits.prescriptions.col.duration"),
        cell: ({ row }) => row.original.duration ?? <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: "dispenseType",
        header: t("visits.prescriptions.col.dispense"),
        cell: ({ row }) => (
          <Badge variant={row.original.dispenseType === "dispensed_to_owner" ? "navy" : "default"}>
            {t(`dispenseType.${row.original.dispenseType}`, { defaultValue: row.original.dispenseType })}
          </Badge>
        ),
      },
      {
        accessorKey: "quantity",
        header: t("visits.prescriptions.col.qty"),
        cell: ({ row }) =>
          row.original.quantity != null ? (
            <span dir="ltr">{formatQuantity(row.original.quantity, lang)}</span>
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
  }, [t, lang, productById, readOnly]);

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
            {t("visits.prescriptions.add")}
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        emptyMessage={t("visits.prescriptions.empty")}
      />

      {formOpen ? (
        <PrescriptionFormDialog
          open
          visitId={visitId}
          prescription={editing}
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
            <p className="text-sm text-muted-foreground">{t("visits.prescriptions.deleteConfirm")}</p>
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
