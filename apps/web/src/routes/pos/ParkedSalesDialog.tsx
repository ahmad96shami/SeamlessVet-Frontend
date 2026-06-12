import { formatDateTime } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import { useDeleteParkedSale, useParkedSales, useResumeParkedSale } from "@/queries/parkedSales";
import { usePosCartStore, type ParkedSale } from "@/stores/posCartStore";

import { computeTotals } from "./cartTotals";

/** Preview total for a parked sale — line totals less its invoice discount (tax excluded; the
 *  server recomputes at issuance). Informational only, so the resume list reads at a glance. */
const parkedTotal = (sale: ParkedSale) =>
  computeTotals(sale.lines, sale.invoiceDiscount, { enabled: false, rate: 0 }).total;

/**
 * The "Parked sales" resume drawer (W19) — lists held carts (most-recent first); a row resumes its
 * sale into the cart (consuming the hold) and the trash discards it. Resuming replaces the current
 * cart, so a warning shows when one is in progress (Park it first to keep it).
 */
export function ParkedSalesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const parked = useParkedSales();
  const resume = useResumeParkedSale();
  const remove = useDeleteParkedSale();
  const cartHasContent = usePosCartStore((s) => s.lines.length > 0 || s.visitId !== null);

  const rows = parked.data ?? [];

  const onResume = (sale: ParkedSale) => {
    resume.mutate(sale, { onSuccess: onClose });
  };
  const onDelete = (id: string) => {
    remove.mutate(id, { onSuccess: () => toast.success(t("pos.park.deleted")) });
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("pos.park.parked")}>
      {cartHasContent && rows.length > 0 ? (
        <p className="mb-3 rounded-lg bg-amber-soft/40 px-3 py-2 text-xs text-amber-900">
          {t("pos.park.replaceWarning")}
        </p>
      ) : null}

      <div className="max-h-80 divide-y overflow-auto rounded-xl border">
        {rows.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">{t("pos.park.empty")}</div>
        ) : (
          rows.map((sale) => (
            <div key={sale.id} className="flex items-center gap-2 p-3">
              <button
                type="button"
                onClick={() => onResume(sale)}
                disabled={resume.isPending}
                className="flex min-w-0 flex-1 flex-col items-start gap-1 text-start transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                <span className="flex w-full items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold text-navy-900">
                    {sale.label}
                  </span>
                  {sale.visitId ? (
                    <Badge variant="secondary" className="flex-none">
                      {t("pos.park.withVisit")}
                    </Badge>
                  ) : null}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{t("pos.park.itemCount", { n: sale.lines.length })}</span>
                  <span aria-hidden>·</span>
                  <span>{formatDateTime(sale.parkedAt, i18n.language)}</span>
                </span>
              </button>
              <span className="flex-none text-sm font-bold tabular-nums text-navy-900">
                <Money value={parkedTotal(sale)} />
              </span>
              <button
                type="button"
                onClick={() => onDelete(sale.id)}
                disabled={remove.isPending}
                aria-label={t("pos.park.delete")}
                className="-my-1 flex-none rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-soft/40 hover:text-destructive disabled:opacity-50"
              >
                <Icon.trash className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
}
