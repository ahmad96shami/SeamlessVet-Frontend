import { formatDate, type BatchResponse } from "@vet/shared";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { useFarmLookup } from "@/hooks/useFarmLookup";
import { useBatches } from "@/queries/batches";

/** A batch's farm name (falls back to a short id) — the label shown wherever a batch is referenced. */
export function batchFarmName(
  batch: Pick<BatchResponse, "farmId">,
  farms: ReturnType<typeof useFarmLookup>["byId"],
): string | undefined {
  return batch.farmId ? farms.get(batch.farmId)?.name : undefined;
}

/**
 * Pick one of a customer's ACTIVE (open) batches to bill directly from the till — the sale joins
 * that batch's settlement (تصفية) and posts to the farm owner ledger. No field visit needed.
 */
export function BatchPickerDialog({
  open,
  onClose,
  customerId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  onSelect: (batch: BatchResponse) => void;
}) {
  const { t, i18n } = useTranslation();
  const query = useBatches({ customerId, status: "open", take: 50 });
  const rows = query.data ?? [];
  const farms = useFarmLookup();
  const doctors = useDoctorOptions();

  return (
    <Dialog open={open} onClose={onClose} title={t("pos.batch.pickTitle")} description={t("pos.batch.pickHint")}>
      <div className="max-h-72 divide-y overflow-auto rounded-xl border">
        {rows.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">{t("pos.batch.none")}</div>
        ) : (
          rows.map((b) => (
            <button
              type="button"
              key={b.id}
              onClick={() => onSelect(b)}
              className="flex w-full items-center justify-between gap-2 p-3 text-start text-sm transition-colors hover:bg-muted"
            >
              <span className="min-w-0">
                <span className="font-medium">{batchFarmName(b, farms.byId) ?? t("finance.batches.noFarm")}</span>
                <span className="ms-2 text-xs text-muted-foreground">
                  {doctors.byId.get(b.responsibleDoctorId) ?? "—"} · {formatDate(b.startDate, i18n.language)}
                </span>
              </span>
              <Badge variant="secondary">
                {t(`batchStatus.${b.status}`, { defaultValue: b.status })}
              </Badge>
            </button>
          ))
        )}
      </div>
    </Dialog>
  );
}
