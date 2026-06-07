import { formatCurrency, type ApiError, type VisitResponse } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { useSystemSettings } from "@/queries/systemSettings";
import { useBilledChargeIds } from "@/routes/visits/useBilledChargeIds";
import { useUpdateVisit } from "@/queries/visits";

/**
 * In-clinic checkup fee (رسوم الكشف, M17/M23). The backend resolves the proposed amount at visit
 * creation; the fee becomes CHARGEABLE when بدء الكشف moves the visit to in_progress, then bills as
 * a POS invoice line (or the completion backstop). Three states here: pending (visit still open —
 * the amount is a proposal confirmed by the start dialog), editable (started, unbilled), and
 * billed/locked (مُفوترة — re-pricing is rejected server-side too). Field visits have no checkup
 * fee — the parent only renders this for in-clinic visits.
 */
export function CheckupFeeCard({ visit, readOnly }: { visit: VisitResponse; readOnly: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const settings = useSystemSettings();
  const update = useUpdateVisit();
  const billed = useBilledChargeIds(visit.id);
  const def = settings.data?.defaultCheckupFee;

  const seed = () =>
    visit.checkupFeeApplied != null ? String(visit.checkupFeeApplied) : def != null ? String(def) : "";
  const [fee, setFee] = useState(seed);
  useEffect(() => {
    setFee(seed());
  }, [visit.checkupFeeApplied, def]);

  const current = fee.trim() === "" ? null : Number(fee);
  const dirty = current != null && !Number.isNaN(current) && current !== (visit.checkupFeeApplied ?? null);
  const isPending = visit.status === "open";

  const onSave = () => {
    if (current == null || Number.isNaN(current)) return;
    update.mutate(
      { id: visit.id, body: { checkupFeeApplied: current } },
      {
        onSuccess: () => toast.success(t("visits.checkupFee.saved")),
        onError: (e: ApiError) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
      <span className="text-sm font-medium">{t("visits.checkupFee.label")}</span>
      {billed.checkupFee ? (
        // Billed on an invoice (or the completion backstop posted it) — locked, server-enforced too.
        <>
          <span dir="ltr" className="font-semibold">
            <Money value={visit.checkupFeeApplied ?? 0} />
          </span>
          <Badge variant="success">{t("visits.checkupFee.billed")}</Badge>
          <span title={t("visits.billedLocked")} className="grid place-items-center text-muted-foreground">
            <Icon.lock className="size-4" aria-label={t("visits.billedLocked")} />
          </span>
        </>
      ) : readOnly ? (
        <span dir="ltr" className="font-semibold">
          <Money value={visit.checkupFeeApplied ?? 0} />
        </span>
      ) : isPending ? (
        // Visit still open — the amount is a proposal; بدء الكشف confirms (and can edit) it.
        <>
          <span dir="ltr" className="font-semibold text-muted-foreground">
            <Money value={visit.checkupFeeApplied ?? def ?? 0} />
          </span>
          <Badge variant="secondary">{t("visits.checkupFee.pending")}</Badge>
        </>
      ) : (
        <>
          <Input
            type="number"
            step="0.01"
            min="0"
            dir="ltr"
            className="w-32"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
          <Button size="sm" onClick={onSave} disabled={!dirty || update.isPending}>
            {update.isPending ? t("admin.common.saving") : t("visits.checkupFee.save")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {def != null ? t("visits.checkupFee.fromSettings", { amount: formatCurrency(def, lang) }) : null}
          </span>
        </>
      )}
    </div>
  );
}
