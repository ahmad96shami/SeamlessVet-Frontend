import { formatDate, type VisitResponse } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Icon } from "@/components/ui/icon";
import { useVisits } from "@/queries/visits";
import { cn } from "@/lib/utils";

const VISIT_STATUS_TONE: Record<string, string> = {
  completed: "green",
  in_progress: "amber",
  scheduled: "gray",
  cancelled: "red",
};

/** Recent visits list — newest first, capped at `limit`. Each row deep-links to the visit. */
export function RecentVisitsCard({ doctorId, limit = 6 }: { doctorId?: string; limit?: number }) {
  const { t, i18n } = useTranslation();
  const q = useVisits({ doctorId, take: limit });
  const rows = q.data ?? [];

  return (
    <div className="card flush">
      <div className="card-head">
        <h3>{t("dashboard.recentVisits.title")}</h3>
        <Link to="/operations/visits" className="cap-12 text-primary">
          {t("dashboard.viewAll")}
        </Link>
      </div>
      {q.isLoading ? (
        <div className="grid place-items-center py-10">
          <Icon.spinner className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{t("dashboard.recentVisits.empty")}</div>
      ) : (
        rows.map((v: VisitResponse) => {
          const tone = VISIT_STATUS_TONE[v.status] ?? "gray";
          const when = v.startedAt ?? v.createdAt;
          return (
            <Link key={v.id} to={`/operations/visits/${v.id}`} className="row hover:bg-[var(--ink-50)]">
              <div className="num strong" style={{ width: 90, fontSize: 13 }}>
                {v.visitNumber ?? "—"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="name truncate">{t(`visitType.${v.visitType}`, { defaultValue: v.visitType })}</div>
                <div className="meta" style={{ fontSize: 12 }}>
                  {formatDate(when, i18n.language)}
                </div>
              </div>
              <span className={cn("pill", tone)}>{t(`visitStatus.${v.status}`, { defaultValue: v.status })}</span>
              <Icon.fwd size={16} />
            </Link>
          );
        })
      )}
    </div>
  );
}
