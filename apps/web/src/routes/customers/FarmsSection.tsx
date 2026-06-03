import type { ColumnDef } from "@tanstack/react-table";
import { type CustomerFarmLedger, type FarmResponse } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import { useDeleteFarm, useFarms } from "@/queries/farms";
import { FarmFormDialog } from "@/routes/customers/FarmFormDialog";
import { balanceClass, statusVariant } from "@/routes/customers/ledgerStatus";

/**
 * A customer's farms (M15) — each with its own ledger (M16). Mounted on the customer detail page,
 * mirroring the pets section. The per-farm balance + ledger-status chips come from the customer
 * detail read's `farmLedgers[]` breakdown (the farm entity carries no balance). Each row links to a
 * farm detail page for the statement + close-account.
 */
export function FarmsSection({
  customerId,
  farmLedgers,
}: {
  customerId: string;
  farmLedgers: CustomerFarmLedger[] | null | undefined;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useFarms({ customerId, take: 100 });
  const farms = query.data ?? [];
  const del = useDeleteFarm();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FarmResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FarmResponse | null>(null);

  const ledgerByFarm = useMemo(() => {
    const m = new Map<string, CustomerFarmLedger>();
    for (const fl of farmLedgers ?? []) m.set(fl.farmId, fl);
    return m;
  }, [farmLedgers]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (f: FarmResponse) => {
    setEditing(f);
    setFormOpen(true);
  };

  const columns = useMemo<ColumnDef<FarmResponse>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("customers.farms.colName"),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "kind",
        header: t("customers.farms.colKind"),
        cell: ({ row }) => t(`farmKind.${row.original.kind}`, { defaultValue: row.original.kind }),
      },
      {
        id: "animal",
        header: t("customers.farms.colAnimal"),
        cell: ({ row }) => {
          const bits = [
            row.original.animalType,
            row.original.headCount != null ? String(row.original.headCount) : null,
          ].filter(Boolean);
          return bits.length ? bits.join(" · ") : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        id: "balance",
        header: t("customers.farms.colBalance"),
        cell: ({ row }) => {
          const fl = ledgerByFarm.get(row.original.id);
          if (!fl) return <span className="text-muted-foreground">—</span>;
          return (
            <span className={cn("font-medium", balanceClass(fl.balance))} dir="ltr">
              <Money value={fl.balance} />
            </span>
          );
        },
      },
      {
        id: "status",
        header: t("customers.farms.colStatus"),
        cell: ({ row }) => {
          const fl = ledgerByFarm.get(row.original.id);
          if (!fl) return <span className="text-muted-foreground">—</span>;
          return (
            <Badge variant={statusVariant(fl.status)}>
              {t(`ledgerStatus.${fl.status}`, { defaultValue: fl.status })}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("customers.farms.account")}
              onClick={() => navigate(`/operations/farms/${row.original.id}`)}
            >
              <Icon.receipt className="size-4" />
            </Button>
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
    [t, navigate, ledgerByFarm],
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
        <h2 className="text-lg font-semibold tracking-tight">{t("customers.farms.title")}</h2>
        <Button size="sm" onClick={openCreate}>
          <Icon.plus className="size-4" />
          {t("customers.farms.new")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={farms}
        isLoading={query.isLoading}
        emptyMessage={t("customers.farms.empty")}
        onRowClick={(f) => navigate(`/operations/farms/${f.id}`)}
      />

      <FarmFormDialog
        open={formOpen}
        customerId={customerId}
        farm={editing}
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
              {t("customers.farms.deleteConfirm", { name: deleteTarget.name })}
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
