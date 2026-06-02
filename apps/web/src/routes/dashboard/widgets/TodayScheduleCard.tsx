import { formatDate, formatDateTime, type AppointmentResponse } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { useAppointments } from "@/queries/appointments";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  attended: "green",
  in_progress: "amber",
  confirmed: "teal",
  scheduled: "gray",
  cancelled: "red",
  no_show: "red",
};

function todayBounds(): { from: string; to: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}


/**
 * "Today's schedule" — the next N appointments scheduled for today. Optionally filtered to a
 * single doctor (vet dashboards pass their own id). Empty state renders inline.
 */
export function TodayScheduleCard({ doctorId, limit = 5 }: { doctorId?: string; limit?: number }) {
  const { t, i18n } = useTranslation();
  const { from, to } = todayBounds();
  const q = useAppointments({ from, to, doctorId, take: 20 });
  const rows = (q.data ?? []).slice(0, limit);

  return (
    <div className="card flush">
      <div className="card-head">
        <div>
          <h3>{t("dashboard.todaySchedule.title")}</h3>
          <div className="sub">{t("dashboard.todaySchedule.subtitle", { count: q.data?.length ?? 0 })}</div>
        </div>
        <Link to="/operations/appointments" className="cap-12 text-primary">
          {t("dashboard.viewAll")}
        </Link>
      </div>
      {q.isLoading ? (
        <div className="grid place-items-center py-10">
          <Icon.spinner className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Icon.cal size={20} />} title={t("dashboard.todaySchedule.empty")} />
      ) : (
        rows.map((a: AppointmentResponse) => {
          const tone = STATUS_TONE[a.status] ?? "gray";
          return (
            <Link key={a.id} to={`/operations/appointments`} className="row hover:bg-[var(--ink-50)]">
              <div className="num strong text-center" style={{ minWidth: 80, fontSize: 14 }}>
                {formatDateTime(a.scheduledAt, i18n.language, "h:mm a")}
              </div>
              <div className="num strong text-start" style={{ minWidth: 90, fontSize: 14 }}>
                {formatDate(a.scheduledAt, i18n.language)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {a.notes ? <div className="name truncate">{a.notes}</div> : null}
              </div>
              <span className={cn("pill", tone)}>{t(`appointmentStatus.${a.status}`, { defaultValue: a.status })}</span>
              <Icon.fwd size={16} className="rtl:-scale-x-100" />
            </Link>
          );
        })
      )}
    </div>
  );
}
