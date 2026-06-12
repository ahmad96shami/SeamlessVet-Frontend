import type { VisitResponse } from "@vet/shared";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Money } from "@/components/ui/money";

import { round2 } from "./cartTotals";
import { useVisitCharges } from "./useVisitCharges";
import { visitRef } from "./VisitPickerDialog";

interface ChargeRow {
  key: string;
  name: string;
  /** "× n" suffix for multi-unit charges (dispensed quantity / night count); omitted for singles. */
  qty?: number;
  amount: number;
}

/**
 * W19.2 — the customer→visit charge prompt's confirm step. Lists a visit's UNBILLED charges
 * (dispensed meds, procedures, catalog vaccinations, and — while in_progress — the checkup fee and
 * closed night stays) so the cashier sees exactly what will be billed before the locked lines load.
 * Confirming links the visit (the cart's VisitLinesSync then mirrors these as locked lines and the
 * server stays authoritative at issuance); the same charge maths feeds both, so the preview matches.
 */
export function VisitChargesConfirmDialog({
  visit,
  onClose,
  onConfirm,
}: {
  visit: VisitResponse;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const { prescriptions, procedures, vaccinations, checkupFee, nightStays, isLoading } =
    useVisitCharges(visit.id);

  const rows: ChargeRow[] = [
    ...prescriptions.map((p) => ({
      key: p.id,
      name: p.name,
      qty: p.quantity,
      amount: round2(p.unitPrice * p.quantity),
    })),
    ...vaccinations.map((v) => ({ key: v.id, name: v.name, amount: round2(v.price) })),
    ...procedures.map((p) => ({ key: p.id, name: p.name, amount: round2(p.price) })),
    ...(checkupFee
      ? [{ key: `checkup-${checkupFee.visitId}`, name: checkupFee.name, amount: round2(checkupFee.price) }]
      : []),
    ...nightStays.map((s) => ({
      key: s.id,
      name: s.name,
      qty: s.nights,
      amount: round2(s.rate * s.nights),
    })),
  ];
  const total = round2(rows.reduce((sum, r) => sum + r.amount, 0));

  return (
    <Dialog
      open
      onClose={onClose}
      title={t("pos.visitCharges.confirmTitle")}
      description={visitRef(visit)}
    >
      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("actions.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("pos.link.noVisitCharges")}
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">{t("pos.visitCharges.confirmHint")}</p>
          <div className="max-h-72 divide-y overflow-auto rounded-xl border">
            {rows.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-2 p-3 text-sm">
                <span className="min-w-0 truncate font-medium text-navy-900">
                  {r.name}
                  {r.qty && r.qty > 1 ? (
                    <span className="ms-1.5 text-xs font-normal text-muted-foreground">× {r.qty}</span>
                  ) : null}
                </span>
                <span className="flex-none font-bold tabular-nums text-navy-900">
                  <Money value={r.amount} />
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-sm font-bold text-navy-900">
            <span>{t("pos.receipt.total")}</span>
            <Money value={total} />
          </div>
        </>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t("admin.common.cancel")}
        </Button>
        <Button type="button" onClick={onConfirm} disabled={isLoading}>
          {t("pos.visitCharges.bill")}
        </Button>
      </div>
    </Dialog>
  );
}
