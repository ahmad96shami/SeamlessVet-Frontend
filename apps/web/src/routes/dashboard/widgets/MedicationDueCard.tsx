import { formatDate, type NotificationResponse } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { useNotifications } from "@/queries/notifications";

/** Read a key from a notification's `payload` blob case-insensitively (the jsonb is PascalCase). */
function payloadString(payload: unknown, key: string): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const obj = payload as Record<string, unknown>;
  const match = Object.keys(obj).find((k) => k.toLowerCase() === key.toLowerCase());
  const v = match ? obj[match] : undefined;
  return typeof v === "string" ? v : undefined;
}

/**
 * Medication doses due — the `medication_due` reminders from the caller's notification feed (M18).
 * Self-scoped: the backend emits these to the prescribing doctor + clinic vets, so this only fills in
 * for those users. Each row deep-links to the originating visit.
 */
export function MedicationDueCard({ limit = 5 }: { limit?: number }) {
  const { t, i18n } = useTranslation();
  const q = useNotifications();
  const rows = (q.data ?? []).filter((n) => n.type === "medication_due").slice(0, limit);

  return (
    <div className="card flush">
      <div className="card-head">
        <h3>{t("dashboard.medicationDue.title")}</h3>
      </div>
      {q.isLoading ? (
        <div className="grid place-items-center py-10">
          <Icon.spinner className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Icon.pill size={20} />} title={t("dashboard.medicationDue.empty")} />
      ) : (
        rows.map((n: NotificationResponse) => {
          const visitId = payloadString(n.payload, "VisitId");
          const row = (
            <div className="row">
              <div className="av amber" style={{ width: 32, height: 32 }}>
                <Icon.pill size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="name truncate">{n.title ?? t("dashboard.medicationDue.title")}</div>
                {n.body ? (
                  <div className="meta truncate" style={{ fontSize: 12 }}>
                    {n.body}
                  </div>
                ) : null}
              </div>
              <span className="pill amber">{formatDate(n.createdAt, i18n.language)}</span>
            </div>
          );
          return visitId ? (
            <Link key={n.id} to={`/operations/visits/${visitId}`} className="block">
              {row}
            </Link>
          ) : (
            <div key={n.id}>{row}</div>
          );
        })
      )}
    </div>
  );
}
