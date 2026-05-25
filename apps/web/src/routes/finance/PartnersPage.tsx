import type { ColumnDef } from "@tanstack/react-table";
import {
  formatDate,
  type PartnershipShareResponse,
  type PartnerResponse,
} from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { usePartnershipEnabled } from "@/hooks/usePartnershipEnabled";
import {
  useDeletePartner,
  useDeletePartnershipShare,
  usePartners,
  usePartnershipShares,
} from "@/queries/partnership";
import { useUsers } from "@/queries/users";
import { PartnerFormDialog } from "@/routes/finance/PartnerFormDialog";
import { ShareFormDialog } from "@/routes/finance/ShareFormDialog";

function activeOn(share: PartnershipShareResponse, day: string): boolean {
  return share.effectiveFrom <= day && (!share.effectiveTo || share.effectiveTo >= day);
}

export function PartnersPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { enabled, isLoading } = usePartnershipEnabled();

  const partnersQ = usePartners({ take: 200 }, enabled);
  const sharesQ = usePartnershipShares({ take: 200 }, enabled);
  const usersQ = useUsers({ take: 200 });
  const delPartner = useDeletePartner();
  const delShare = useDeletePartnershipShare();

  const [partnerFormOpen, setPartnerFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerResponse | null>(null);
  const [deletePartnerTarget, setDeletePartnerTarget] = useState<PartnerResponse | null>(null);
  const [shareFormOpen, setShareFormOpen] = useState(false);
  const [editingShare, setEditingShare] = useState<PartnershipShareResponse | null>(null);
  const [deleteShareTarget, setDeleteShareTarget] = useState<PartnershipShareResponse | null>(null);

  const partners = partnersQ.data ?? [];
  const shares = sharesQ.data ?? [];
  const partnerById = useMemo(
    () => new Map(partners.map((p) => [p.id, p] as const)),
    [partners],
  );
  const userById = useMemo(
    () => new Map((usersQ.data ?? []).map((u) => [u.id, u] as const)),
    [usersQ.data],
  );

  const today = new Date().toISOString().slice(0, 10);
  const totalActive = useMemo(
    () => shares.filter((s) => activeOn(s, today)).reduce((sum, s) => sum + s.sharePercent, 0),
    [shares, today],
  );

  const partnerColumns = useMemo<ColumnDef<PartnerResponse>[]>(
    () => [
      {
        accessorKey: "displayName",
        header: t("finance.partners.displayName"),
        cell: ({ row }) => <span className="font-medium">{row.original.displayName}</span>,
      },
      {
        accessorKey: "userId",
        header: t("finance.partners.linkedUser"),
        cell: ({ row }) =>
          row.original.userId
            ? (userById.get(row.original.userId)?.fullName ?? row.original.userId)
            : t("finance.partners.noUser"),
      },
      {
        accessorKey: "notes",
        header: t("finance.partners.notes"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.notes ?? "—"}</span>
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
              onClick={() => {
                setEditingPartner(row.original);
                setPartnerFormOpen(true);
              }}
            >
              <Icon.edit className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("admin.common.delete")}
              onClick={() => setDeletePartnerTarget(row.original)}
            >
              <Icon.trash className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [t, userById],
  );

  const shareColumns = useMemo<ColumnDef<PartnershipShareResponse>[]>(
    () => [
      {
        accessorKey: "partnerId",
        header: t("finance.partners.shares.partner"),
        cell: ({ row }) => (
          <span className="font-medium">
            {partnerById.get(row.original.partnerId)?.displayName ?? row.original.partnerId}
          </span>
        ),
      },
      {
        accessorKey: "sharePercent",
        header: t("finance.partners.shares.sharePercent"),
        cell: ({ row }) => `${row.original.sharePercent}%`,
      },
      {
        accessorKey: "effectiveFrom",
        header: t("finance.partners.shares.effectiveFrom"),
        cell: ({ row }) => (
          <span dir="ltr" className="text-sm">
            {formatDate(row.original.effectiveFrom, lang)}
            {row.original.effectiveTo
              ? ` → ${formatDate(row.original.effectiveTo, lang)}`
              : ` → ${t("finance.partners.shares.openEnded")}`}
          </span>
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
              onClick={() => {
                setEditingShare(row.original);
                setShareFormOpen(true);
              }}
            >
              <Icon.edit className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("admin.common.delete")}
              onClick={() => setDeleteShareTarget(row.original)}
            >
              <Icon.trash className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [t, lang, partnerById],
  );

  if (isLoading) {
    return (
      <div className="grid h-48 place-items-center">
        <Icon.spinner className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Solo-gate: /partners 404s (or 403s) outside a partnership env → the surface is unavailable.
  if (!enabled) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t("finance.partners.soloHidden")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("finance.partners.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("finance.partners.subtitle")}</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("nav.partners")}</h2>
          <Button
            onClick={() => {
              setEditingPartner(null);
              setPartnerFormOpen(true);
            }}
          >
            <Icon.plus className="size-4" />
            {t("finance.partners.new")}
          </Button>
        </div>
        <DataTable
          columns={partnerColumns}
          data={partners}
          isLoading={partnersQ.isLoading}
          emptyMessage={t("finance.partners.empty")}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{t("finance.partners.shares.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("finance.partners.shares.total")}:{" "}
              <span className={totalActive > 100 ? "font-bold text-destructive" : "font-medium text-foreground"}>
                {totalActive}%
              </span>
            </p>
          </div>
          <Button
            variant="outline"
            disabled={partners.length === 0}
            onClick={() => {
              setEditingShare(null);
              setShareFormOpen(true);
            }}
          >
            <Icon.plus className="size-4" />
            {t("finance.partners.shares.add")}
          </Button>
        </div>
        <DataTable
          columns={shareColumns}
          data={shares}
          isLoading={sharesQ.isLoading}
          emptyMessage={t("finance.partners.shares.empty")}
        />
      </section>

      <PartnerFormDialog
        open={partnerFormOpen}
        partner={editingPartner}
        users={usersQ.data ?? []}
        onClose={() => setPartnerFormOpen(false)}
      />
      <ShareFormDialog
        open={shareFormOpen}
        share={editingShare}
        partners={partners}
        onClose={() => setShareFormOpen(false)}
      />

      <Dialog
        open={deletePartnerTarget !== null}
        onClose={() => setDeletePartnerTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("finance.partners.deleteConfirm", { name: deletePartnerTarget?.displayName ?? "" })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletePartnerTarget(null)} disabled={delPartner.isPending}>
              {t("admin.common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={delPartner.isPending}
              onClick={() => {
                if (!deletePartnerTarget) return;
                delPartner.mutate(deletePartnerTarget.id, {
                  onSuccess: () => {
                    toast.success(t("admin.common.deleted"));
                    setDeletePartnerTarget(null);
                  },
                });
              }}
            >
              {t("admin.common.delete")}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={deleteShareTarget !== null}
        onClose={() => setDeleteShareTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("finance.partners.shares.deleteConfirm")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteShareTarget(null)} disabled={delShare.isPending}>
              {t("admin.common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={delShare.isPending}
              onClick={() => {
                if (!deleteShareTarget) return;
                delShare.mutate(deleteShareTarget.id, {
                  onSuccess: () => {
                    toast.success(t("admin.common.deleted"));
                    setDeleteShareTarget(null);
                  },
                });
              }}
            >
              {t("admin.common.delete")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
