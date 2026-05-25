import { formatDate, type VisitResponse } from "@vet/shared";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useVisits } from "@/queries/visits";

/** A web-created visit has no `visitNumber`; fall back to a short id (the W4 convention). */
export const visitRef = (v: Pick<VisitResponse, "id" | "visitNumber">) =>
  v.visitNumber ?? `#${v.id.slice(0, 8)}`;

/** Pick one of a customer's visits to link to the sale (its unbilled charges auto-assemble). */
export function VisitPickerDialog({
  open,
  onClose,
  customerId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  onSelect: (visit: VisitResponse) => void;
}) {
  const { t, i18n } = useTranslation();
  const query = useVisits({ customerId, take: 50 });
  const rows = query.data ?? [];

  return (
    <Dialog open={open} onClose={onClose} title={t("pos.link.linkVisit")}>
      <div className="max-h-72 divide-y overflow-auto rounded-xl border">
        {rows.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">{t("visits.empty")}</div>
        ) : (
          rows.map((v) => (
            <button
              type="button"
              key={v.id}
              onClick={() => onSelect(v)}
              className="flex w-full items-center justify-between gap-2 p-3 text-start text-sm transition-colors hover:bg-muted"
            >
              <span className="min-w-0">
                <span className="font-medium" dir="ltr">
                  {visitRef(v)}
                </span>
                <span className="ms-2 text-xs text-muted-foreground">
                  {formatDate(v.startedAt ?? v.createdAt, i18n.language)}
                </span>
              </span>
              <Badge variant="secondary">
                {t(`visitStatus.${v.status}`, { defaultValue: v.status })}
              </Badge>
            </button>
          ))
        )}
      </div>
    </Dialog>
  );
}
