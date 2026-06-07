import type { ColumnDef } from "@tanstack/react-table";
import { formatDate, type VaccinationResponse, type VisitResponse } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import { useCustomer } from "@/queries/customers";
import { useFieldInventories } from "@/queries/inventory";
import { usePet } from "@/queries/pets";
import { useDeleteVaccination, useVaccinations } from "@/queries/vaccinations";
import { useBilledChargeIds } from "@/routes/visits/useBilledChargeIds";
import { VaccinationCertificate } from "@/routes/visits/VaccinationCertificate";
import { VaccinationFormDialog } from "@/routes/visits/VaccinationFormDialog";

/** Vaccinations recorded on the visit (PRD §5.2). `nextDueDate` drives the M11 reminders. */
export function VaccinationsTab({ visit, readOnly }: { visit: VisitResponse; readOnly: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const query = useVaccinations({ visitId: visit.id, take: 200 });
  const rows = query.data ?? [];
  const del = useDeleteVaccination();
  const billed = useBilledChargeIds(visit.id);

  // Names for the printable certificate: recipient is the visit's pet, else the customer (farm).
  const owner = useCustomer(visit.customerId);
  const pet = usePet(visit.petId ?? null);
  const fieldInvs = useFieldInventories();
  const ownerName = owner.data?.fullName ?? null;
  const recipientName = pet.data?.name ?? owner.data?.fullName ?? null;
  const doctorName = useMemo(
    () => (fieldInvs.data ?? []).find((f) => f.doctorId === visit.doctorId)?.doctorName ?? null,
    [fieldInvs.data, visit.doctorId],
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VaccinationResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaccinationResponse | null>(null);

  const columns = useMemo<ColumnDef<VaccinationResponse>[]>(() => {
    const cols: ColumnDef<VaccinationResponse>[] = [
      {
        accessorKey: "vaccineType",
        header: t("visits.vaccinations.col.type"),
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="font-medium">{row.original.vaccineType}</span>
            {billed.vaccinations.has(row.original.id) ? (
              <Badge variant="success">{t("visits.billedVaccination")}</Badge>
            ) : null}
          </span>
        ),
      },
      {
        accessorKey: "price",
        header: t("visits.vaccinations.col.price"),
        cell: ({ row }) =>
          // Catalog-linked vaccinations carry the billable snapshot; legacy rows have none.
          row.original.price != null ? (
            <Money value={row.original.price} />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "dateGiven",
        header: t("visits.vaccinations.col.given"),
        cell: ({ row }) => <span dir="ltr">{formatDate(row.original.dateGiven, lang)}</span>,
      },
      {
        accessorKey: "nextDueDate",
        header: t("visits.vaccinations.col.due"),
        cell: ({ row }) =>
          row.original.nextDueDate ? (
            <span dir="ltr">{formatDate(row.original.nextDueDate, lang)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ];
    cols.push({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <VaccinationCertificate
            vaccination={row.original}
            recipientName={recipientName}
            ownerName={ownerName}
            doctorName={doctorName}
          />
          {!readOnly ? (
            <>
              <Button size="icon" variant="ghost" aria-label={t("admin.common.edit")} onClick={() => { setEditing(row.original); setFormOpen(true); }}>
                <Icon.edit className="size-4" />
              </Button>
              {billed.vaccinations.has(row.original.id) ? (
                // Billed on an invoice — the row backs an issued invoice line (server-enforced too;
                // the edit stays for the clinical dates, but re-pricing is rejected server-side).
                <span
                  title={t("visits.billedLocked")}
                  className="grid size-10 place-items-center text-muted-foreground"
                >
                  <Icon.lock className="size-4" aria-label={t("visits.billedLocked")} />
                </span>
              ) : (
                <Button size="icon" variant="ghost" aria-label={t("admin.common.delete")} onClick={() => setDeleteTarget(row.original)}>
                  <Icon.trash className="size-4 text-destructive" />
                </Button>
              )}
            </>
          ) : null}
        </div>
      ),
    });
    return cols;
  }, [t, lang, readOnly, recipientName, ownerName, doctorName, billed]);

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
            {t("visits.vaccinations.add")}
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        emptyMessage={t("visits.vaccinations.empty")}
      />

      {formOpen ? (
        <VaccinationFormDialog open visit={visit} vaccination={editing} onClose={() => setFormOpen(false)} />
      ) : null}

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title={t("admin.common.deleteConfirmTitle")}>
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("visits.vaccinations.deleteConfirm")}</p>
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
