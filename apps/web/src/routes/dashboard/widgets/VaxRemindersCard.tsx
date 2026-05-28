import { formatDate, type UpcomingVaccinationRow } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { useUpcomingVaccinations } from "@/queries/reports";
import { cn } from "@/lib/utils";

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function urgency(nextDueDate: string | null | undefined): "red" | "amber" | "teal" {
  if (!nextDueDate) return "teal";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate);
  const days = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (days <= 1) return "red";
  if (days <= 3) return "amber";
  return "teal";
}

/** Upcoming vaccinations — next 7 days, top 5. Drills into the full report. */
export function VaxRemindersCard({ limit = 5 }: { limit?: number }) {
  const { t, i18n } = useTranslation();
  const q = useUpcomingVaccinations({ from: isoDay(0), to: isoDay(7) });
  const rows = (q.data?.rows ?? []).slice(0, limit);

  return (
    <div className="card flush">
      <div className="card-head">
        <h3>{t("dashboard.vaxReminders.title")}</h3>
        <Link to="/reports/vaccinations" className="cap-12 text-primary">
          {t("dashboard.viewAll")}
        </Link>
      </div>
      {q.isLoading ? (
        <div className="grid place-items-center py-10">
          <Icon.spinner className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Icon.syringe size={20} />} title={t("dashboard.vaxReminders.empty")} />
      ) : (
        rows.map((r: UpcomingVaccinationRow) => {
          const tone = urgency(r.nextDueDate);
          return (
            <div key={r.id} className="row">
              <div className={cn("av", tone)} style={{ width: 32, height: 32 }}>
                <Icon.syringe size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="name truncate">{r.vaccineType}</div>
                <div className="meta" style={{ fontSize: 12 }}>
                  {r.petId ? r.petId.slice(0, 8) : r.customerId?.slice(0, 8) ?? "—"}
                </div>
              </div>
              <span className={cn("pill", tone)}>{r.nextDueDate ? formatDate(r.nextDueDate, i18n.language) : "—"}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
