import { formatDate, type AppointmentResponse } from "@vet/shared";
import { useTranslation } from "react-i18next";

import { isClosedDay, isSameDay, isToday } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { appointmentBlockTone } from "@/routes/appointments/appointmentStatus";
import type { AppointmentLabel } from "@/routes/appointments/TimeGrid";

interface MonthGridProps {
  /** A stable 42-cell grid. */
  days: Date[];
  /** The anchored month (cells outside it are dimmed). */
  month: number;
  appointments: AppointmentResponse[];
  labelFor: (a: AppointmentResponse) => AppointmentLabel;
  onSelectDay: (d: Date) => void;
}

const MAX_CHIPS = 3;

/** Month overview: a 6×7 date grid; each cell lists the day's appointments (status-coloured chips,
 * earliest first) and drills into the day view on click. */
export function MonthGrid({ days, month, appointments, labelFor, onSelectDay }: MonthGridProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const sorted = [...appointments].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const byDay = days.map((day) => sorted.filter((a) => isSameDay(day, new Date(a.scheduledAt))));

  return (
    <div>
      <div className="grid grid-cols-7 border-b">
        {days.slice(0, 7).map((d) => (
          <div
            key={d.toISOString()}
            className="border-s py-2 text-center text-xs font-bold text-muted-foreground first:border-s-0"
          >
            {formatDate(d, lang, "EEE")}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === month;
          const today = isToday(day);
          const closed = isClosedDay(day);
          const items = byDay[i] ?? [];
          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex min-h-[104px] flex-col gap-1 border-s border-t p-1.5 text-start transition-colors hover:bg-[var(--paper-soft)]",
                i % 7 === 0 && "border-s-0",
                i < 7 && "border-t-0",
              )}
              style={{
                background: closed ? "var(--paper-soft)" : undefined,
                opacity: inMonth ? 1 : 0.45,
              }}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center self-start rounded-full text-xs font-bold tabular-nums",
                  today ? "bg-teal-500 text-white" : "text-[var(--fg-strong)]",
                )}
              >
                {formatDate(day, lang, "d")}
              </span>
              <div className="flex flex-col gap-0.5">
                {items.slice(0, MAX_CHIPS).map((a) => {
                  const tone = appointmentBlockTone(a.status);
                  return (
                    <div
                      key={a.id}
                      className="truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight"
                      style={{ background: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}
                    >
                      <span className="tabular-nums opacity-80">
                        {formatDate(new Date(a.scheduledAt), lang, "h:mm a")}
                      </span>{" "}
                      <span className={cn(a.status === "cancelled" && "line-through")}>
                        {labelFor(a).primary}
                      </span>
                    </div>
                  );
                })}
                {items.length > MAX_CHIPS ? (
                  <span className="ps-1 text-[10px] font-semibold text-muted-foreground">
                    {t("appointments.more", { count: items.length - MAX_CHIPS })}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
