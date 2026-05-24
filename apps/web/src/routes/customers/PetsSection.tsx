import type { ColumnDef } from "@tanstack/react-table";
import { formatDate, formatQuantity, type PetResponse } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useDeletePet, usePets } from "@/queries/pets";
import { PetFormDialog } from "@/routes/customers/PetFormDialog";

/** A customer's pets — master medical profiles. Mounted on the customer detail page. */
export function PetsSection({ customerId }: { customerId: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const query = usePets({ customerId, take: 100 });
  const pets = query.data ?? [];
  const del = useDeletePet();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PetResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PetResponse | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: PetResponse) => {
    setEditing(p);
    setFormOpen(true);
  };

  const columns = useMemo<ColumnDef<PetResponse>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("customers.pets.colName"),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "speciesBreed",
        header: t("customers.pets.colSpecies"),
        cell: ({ row }) => {
          const s = [row.original.species, row.original.breed].filter(Boolean).join(" · ");
          return s || <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: "sex",
        header: t("customers.pets.colSex"),
        cell: ({ row }) =>
          row.original.sex ? (
            t(`petSex.${row.original.sex}`, { defaultValue: row.original.sex })
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "dateOfBirth",
        header: t("customers.pets.colDob"),
        cell: ({ row }) =>
          row.original.dateOfBirth ? (
            <span dir="ltr">{formatDate(row.original.dateOfBirth, lang)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "weightLatest",
        header: t("customers.pets.colWeight"),
        cell: ({ row }) =>
          row.original.weightLatest != null ? (
            <span dir="ltr">{formatQuantity(row.original.weightLatest, lang)}</span>
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
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{t("customers.pets.title")}</h2>
        <Button size="sm" onClick={openCreate}>
          <Icon.plus className="size-4" />
          {t("customers.pets.new")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={pets}
        isLoading={query.isLoading}
        emptyMessage={t("customers.pets.empty")}
      />

      <PetFormDialog
        open={formOpen}
        customerId={customerId}
        pet={editing}
        onClose={() => setFormOpen(false)}
      />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("customers.pets.deleteConfirm", { name: deleteTarget.name })}
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
    </section>
  );
}
