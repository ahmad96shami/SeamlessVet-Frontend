import type { ColumnDef } from "@tanstack/react-table";
import { formatDate, type CustomerResponse, type VaccinationResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useDeleteVaccination, useVaccinations } from "@/queries/vaccinations";
import { CustomerPickerDialog } from "@/routes/pos/CustomerPickerDialog";
import { resolveRecipient } from "@/routes/vaccinations/recipient";
import { StandaloneVaccinationDialog } from "@/routes/vaccinations/StandaloneVaccinationDialog";
import { useRecipientMaps } from "@/routes/vaccinations/useRecipientMaps";
import { VaccinationCertificate } from "@/routes/visits/VaccinationCertificate";

/** The vaccination records list (W13): all vaccinations, newest first, create-outside-a-visit. */
export function VaccinationsListPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);
  useEffect(() => reset(), [customer, reset]);

  const query = useVaccinations({ customerId: customer?.id || undefined, skip, take });
  const rows = query.data ?? [];
  const maps = useRecipientMaps();
  const del = useDeleteVaccination();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VaccinationResponse | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaccinationResponse | null>(null);

  const columns = useMemo<ColumnDef<VaccinationResponse>[]>(
    () => [
      {
        accessorKey: "vaccineType",
        header: t("vaccinations.col.type"),
        cell: ({ row }) => <span className="font-medium">{row.original.vaccineType}</span>,
      },
      {
        id: "recipient",
        header: t("vaccinations.col.recipient"),
        cell: ({ row }) => {
          const r = resolveRecipient(row.original, maps);
          return (
            <div className="flex items-center gap-2">
              <span>{r.name ?? "—"}</span>
              {r.isFarmGroup ? (
                <Badge variant="secondary">{t("vaccinations.recipientFarm")}</Badge>
              ) : r.owner ? (
                <span className="text-xs text-muted-foreground">· {r.owner}</span>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "price",
        header: t("vaccinations.col.price"),
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
        header: t("vaccinations.col.given"),
        cell: ({ row }) => <span dir="ltr">{formatDate(row.original.dateGiven, lang)}</span>,
      },
      {
        accessorKey: "nextDueDate",
        header: t("vaccinations.col.due"),
        cell: ({ row }) =>
          row.original.nextDueDate ? (
            <span dir="ltr">{formatDate(row.original.nextDueDate, lang)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const r = resolveRecipient(row.original, maps);
          return (
            <div className="flex justify-end gap-1">
              <VaccinationCertificate
                vaccination={row.original}
                recipientName={r.name}
                ownerName={r.owner ?? r.name}
                doctorName={null}
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label={t("admin.common.edit")}
                onClick={() => {
                  setEditing(row.original);
                  setEditingLabel(r.name);
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
          );
        },
      },
    ],
    [t, lang, maps],
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
    <div className="space-y-4">
      {/* Toolbar: customer filter + new */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" onClick={() => setPickerOpen(true)}>
            <Icon.search className="size-4" />
            {customer ? customer.fullName : t("vaccinations.allCustomers")}
          </Button>
          {customer ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("vaccinations.allCustomers")}
              onClick={() => setCustomer(null)}
            >
              <Icon.close className="size-4" />
            </Button>
          ) : null}
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setEditingLabel(null);
            setFormOpen(true);
          }}
        >
          <Icon.plus className="size-4" />
          {t("vaccinations.new")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        emptyMessage={t("vaccinations.empty")}
      />
      <Pagination
        page={page + 1}
        canPrev={canPrev}
        canNext={rows.length === take}
        onPrev={prev}
        onNext={next}
      />

      {formOpen ? (
        <StandaloneVaccinationDialog
          open
          vaccination={editing}
          recipientLabel={editingLabel}
          onClose={() => setFormOpen(false)}
        />
      ) : null}

      <CustomerPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(c) => {
          setCustomer(c);
          setPickerOpen(false);
        }}
      />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("vaccinations.deleteTitle")}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("vaccinations.deleteConfirm")}</p>
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
    </div>
  );
}
