import { formatCurrency, type ApiError, type VisitResponse } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { useSystemSettings } from "@/queries/systemSettings";
import { useUpdateVisit } from "@/queries/visits";

/**
 * In-clinic checkup fee (رسوم الكشف, M17). The backend auto-applies `defaultCheckupFee` to a new
 * in-clinic visit and posts it to the owner ledger on completion; this card lets reception/vet edit
 * or waive it (set 0) before then. Field visits have no checkup fee — the parent only renders this for
 * in-clinic visits. Terminal visits show it read-only.
 */
export function CheckupFeeCard({ visit, readOnly }: { visit: VisitResponse; readOnly: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const settings = useSystemSettings();
  const update = useUpdateVisit();
  const def = settings.data?.defaultCheckupFee;

  const seed = () =>
    visit.checkupFeeApplied != null ? String(visit.checkupFeeApplied) : def != null ? String(def) : "";
  const [fee, setFee] = useState(seed);
  useEffect(() => {
    setFee(seed());
  }, [visit.checkupFeeApplied, def]);

  const current = fee.trim() === "" ? null : Number(fee);
  const dirty = current != null && !Number.isNaN(current) && current !== (visit.checkupFeeApplied ?? null);

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
      {readOnly ? (
        <span dir="ltr" className="font-semibold">
          <Money value={visit.checkupFeeApplied ?? 0} />
        </span>
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
