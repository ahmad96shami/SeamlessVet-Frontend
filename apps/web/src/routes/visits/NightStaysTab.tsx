import type { ColumnDef } from "@tanstack/react-table";
import { formatCurrency, formatDateTime, type NightStayResponse } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import { useCloseNightStay, useDeleteNightStay, useNightStays } from "@/queries/nightStays";
import { useSystemSettings } from "@/queries/systemSettings";
import { NightStayFormDialog } from "@/routes/visits/NightStayFormDialog";

/**
 * Hotel-style night count for an open stay (mirrors the backend `NightStayChargeCalculator`): a guest
 * still present **past** the daily checkout hour on day D is charged that night too; leaving on/before
 * it bills through D-1. Evaluated in the browser's local (clinic) wall-clock, like the server.
 */
function estimateNights(checkInIso: string, checkoutHour: number, now: Date): number {
  const checkIn = new Date(checkInIso);
  if (Number.isNaN(checkIn.getTime()) || now <= checkIn) return 0;
  const pastBoundary =
    now.getHours() > checkoutHour ||
    (now.getHours() === checkoutHour && (now.getMinutes() > 0 || now.getSeconds() > 0));
  const last = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!pastBoundary) last.setDate(last.getDate() - 1);
  const ci = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
  const nights = Math.round((last.getTime() - ci.getTime()) / 86_400_000) + 1;
  return Math.max(0, nights);
}

const isClosed = (s: NightStayResponse) => s.checkOutAt != null;

/** Night-stays / boarding on an in-clinic visit (مبيت, M17). Clinic-only — the parent gates the tab. */
export function NightStaysTab({ visitId, readOnly }: { visitId: string; readOnly: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const query = useNightStays(visitId);
  const rows = query.data ?? [];
  const settings = useSystemSettings();
  const checkoutHour = settings.data?.nightStayCheckoutHour ?? 12;
  const close = useCloseNightStay();
  const del = useDeleteNightStay();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NightStayResponse | null>(null);
  const [closeTarget, setCloseTarget] = useState<NightStayResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NightStayResponse | null>(null);

  const now = new Date();
  const hasOpen = rows.some((r) => !isClosed(r));

  // Estimated nights/total for the stay being closed (the server is authoritative on close).
  const closeEstimate = useMemo(() => {
    if (!closeTarget) return { nights: 0, total: 0 };
    const nights = estimateNights(closeTarget.checkInAt, checkoutHour, now);
    return { nights, total: nights * closeTarget.nightlyRate };
  }, [closeTarget, checkoutHour, now]);

  const columns = useMemo<ColumnDef<NightStayResponse>[]>(() => {
    const cols: ColumnDef<NightStayResponse>[] = [
      {
        id: "careType",
        header: t("visits.nightStays.col.careType"),
        cell: ({ row }) => t(`careType.${row.original.careType}`, { defaultValue: row.original.careType }),
      },
      {
        id: "checkIn",
        header: t("visits.nightStays.col.checkIn"),
        cell: ({ row }) => (
          <span dir="ltr">{formatDateTime(row.original.checkInAt, lang, "yyyy/MM/dd h:mm a")}</span>
        ),
      },
      {
        id: "nights",
        header: t("visits.nightStays.col.nights"),
        cell: ({ row }) => {
          const s = row.original;
          if (isClosed(s)) return s.nightsCount;
          return <span className="text-muted-foreground">≈ {estimateNights(s.checkInAt, checkoutHour, now)}</span>;
        },
      },
      {
        id: "rate",
        header: t("visits.nightStays.col.rate"),
        cell: ({ row }) => <span dir="ltr"><Money value={row.original.nightlyRate} /></span>,
      },
      {
        id: "total",
        header: t("visits.nightStays.col.total"),
        cell: ({ row }) => {
          const s = row.original;
          if (isClosed(s)) return <span dir="ltr"><Money value={s.total} /></span>;
          const est = estimateNights(s.checkInAt, checkoutHour, now) * s.nightlyRate;
          return <span dir="ltr" className="text-muted-foreground">≈ <Money value={est} /></span>;
        },
      },
      {
        id: "status",
        header: t("visits.nightStays.col.status"),
        cell: ({ row }) =>
          isClosed(row.original) ? (
            <Badge variant="secondary">{t("visits.nightStays.statusClosed")}</Badge>
          ) : (
            <Badge variant="warning">{t("visits.nightStays.statusOpen")}</Badge>
          ),
      },
    ];
    if (!readOnly) {
      cols.push({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const s = row.original;
          if (isClosed(s)) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="teal" onClick={() => setCloseTarget(s)}>
                <Icon.check className="size-4" />
                {t("visits.nightStays.close")}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={t("admin.common.edit")}
                onClick={() => {
                  setEditing(s);
                  setFormOpen(true);
                }}
              >
                <Icon.edit className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={t("admin.common.delete")}
                onClick={() => setDeleteTarget(s)}
              >
                <Icon.trash className="size-4 text-destructive" />
              </Button>
            </div>
          );
        },
      });
    }
    return cols;
  }, [t, lang, readOnly, checkoutHour, now]);

  const confirmClose = () => {
    if (!closeTarget) return;
    close.mutate(
      { id: closeTarget.id },
      {
        onSuccess: () => {
          toast.success(t("visits.nightStays.closed"));
          setCloseTarget(null);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

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
            {t("visits.nightStays.add")}
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        emptyMessage={t("visits.nightStays.empty")}
      />

      {hasOpen ? (
        <p className="text-xs text-muted-foreground">
          {t("visits.nightStays.estimateHint", { hour: `${String(checkoutHour).padStart(2, "0")}:00` })}
        </p>
      ) : null}

      {formOpen ? (
        <NightStayFormDialog open visitId={visitId} stay={editing} onClose={() => setFormOpen(false)} />
      ) : null}

      <Dialog
        open={closeTarget !== null}
        onClose={() => setCloseTarget(null)}
        title={t("visits.nightStays.closeTitle")}
      >
        {closeTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("visits.nightStays.closeBody", {
                nights: closeEstimate.nights,
                total: formatCurrency(closeEstimate.total, lang),
              })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCloseTarget(null)} disabled={close.isPending}>
                {t("admin.common.cancel")}
              </Button>
              <Button variant="teal" onClick={confirmClose} disabled={close.isPending}>
                {close.isPending ? t("admin.common.saving") : t("visits.nightStays.close")}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("visits.nightStays.deleteConfirm")}</p>
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
