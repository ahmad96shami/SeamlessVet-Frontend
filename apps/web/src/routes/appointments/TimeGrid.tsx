import { formatDate, type AppointmentResponse } from "@vet/shared";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  DEFAULT_DURATION_MIN,
  HOUR_ROW_PX,
  hoursSinceMidnight,
  isClosedDay,
  isSameDay,
  isToday,
} from "@/lib/calendar";
import { appointmentBlockTone, doctorInitials } from "@/routes/appointments/appointmentStatus";

export interface AppointmentLabel {
  primary: string;
  secondary?: string | null;
  doctorName?: string | null;
}

interface TimeGridProps {
  /** 1 day (day view) or 7 (week view). */
  days: Date[];
  appointments: AppointmentResponse[];
  labelFor: (a: AppointmentResponse) => AppointmentLabel;
  onSelectDay?: (d: Date) => void;
  onSelectAppointment?: (a: AppointmentResponse) => void;
  /** Click an empty area of a day column → book at that day + hour. */
  onSelectSlot?: (start: Date) => void;
}

/**
 * The day/week time grid: a fixed hour rail (08:00–18:00) plus one column per day, with
 * absolutely-positioned appointment blocks (status-coloured) and a "now" line on today. Mirrors the
 * design's week calendar (`screens-operations-2.jsx`); RTL-safe via logical inset properties, so the
 * hour rail sits at the inline-start (right) and days flow الأحد → السبت.
 */
export function TimeGrid({
  days,
  appointments,
  labelFor,
  onSelectDay,
  onSelectAppointment,
  onSelectSlot,
}: TimeGridProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);
  const bodyHeight = hours.length * HOUR_ROW_PX;
  const gridCols = `56px repeat(${days.length}, minmax(0, 1fr))`;
  const minWidth = days.length > 1 ? 760 : undefined;

  const byDay: AppointmentResponse[][] = days.map(() => []);
  for (const a of appointments) {
    const idx = days.findIndex((day) => isSameDay(day, new Date(a.scheduledAt)));
    if (idx >= 0) byDay[idx]?.push(a);
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
        {/* Day headers */}
        <div className="grid border-b" style={{ gridTemplateColumns: gridCols }}>
          <div className="bg-[var(--paper-soft)]" />
          {days.map((day) => {
            const today = isToday(day);
            const closed = isClosedDay(day);
            const headerInner = (
              <>
                <div
                  className="text-xs font-bold"
                  style={{ color: today ? "var(--teal-700)" : "var(--ink-500)" }}
                >
                  {formatDate(day, lang, "EEEE")}
                </div>
                <div
                  className="text-lg font-bold tabular-nums"
                  style={{ color: today ? "var(--teal-700)" : "var(--fg-strong)" }}
                >
                  {formatDate(day, lang, "d")}
                </div>
                {closed ? (
                  <div className="text-[11px] text-muted-foreground">{t("appointments.closed")}</div>
                ) : null}
              </>
            );
            return (
              <div
                key={day.toISOString()}
                className="border-s py-2 text-center"
                style={{
                  background: today
                    ? "var(--teal-50)"
                    : closed
                      ? "var(--paper-soft)"
                      : "var(--paper)",
                }}
              >
                {onSelectDay ? (
                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    className="w-full rounded-md py-0.5 transition-colors hover:bg-black/[0.03]"
                  >
                    {headerInner}
                  </button>
                ) : (
                  headerInner
                )}
              </div>
            );
          })}
        </div>

        {/* Hour rail + day columns */}
        <div className="grid" style={{ gridTemplateColumns: gridCols }}>
          <div className="bg-[var(--paper-soft)]">
            {hours.map((h, i) => (
              <div
                key={h}
                className="px-1.5 pt-1 text-center"
                style={{ height: HOUR_ROW_PX, borderTop: i === 0 ? 0 : "1px solid var(--ink-100)" }}
              >
                <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {formatDate(new Date(2000, 0, 1, h), lang, "HH:mm")}
                </span>
              </div>
            ))}
          </div>

          {days.map((day, ci) => {
            const closed = isClosedDay(day);
            const today = isToday(day);
            const now = new Date();
            const nowH = hoursSinceMidnight(now);
            const showNow = today && nowH >= DAY_START_HOUR && nowH <= DAY_END_HOUR;
            return (
              <div
                key={day.toISOString()}
                onClick={
                  onSelectSlot
                    ? (e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const raw = DAY_START_HOUR + Math.floor((e.clientY - rect.top) / HOUR_ROW_PX);
                        const hour = Math.max(DAY_START_HOUR, Math.min(DAY_END_HOUR - 1, raw));
                        onSelectSlot(
                          new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0),
                        );
                      }
                    : undefined
                }
                className={cn("relative border-s", onSelectSlot && "cursor-pointer")}
                style={{
                  height: bodyHeight,
                  background: closed
                    ? "repeating-linear-gradient(135deg, var(--paper-soft) 0 6px, var(--paper) 6px 12px)"
                    : today
                      ? "rgba(232,244,246,0.4)"
                      : "var(--paper)",
                }}
              >
                {hours.map((h, ri) => (
                  <div
                    key={h}
                    style={{ height: HOUR_ROW_PX, borderTop: ri === 0 ? 0 : "1px solid var(--ink-100)" }}
                  />
                ))}

                {(byDay[ci] ?? []).map((a) => (
                  <AppointmentBlock
                    key={a.id}
                    appointment={a}
                    label={labelFor(a)}
                    lang={lang}
                    onClick={onSelectAppointment ? () => onSelectAppointment(a) : undefined}
                  />
                ))}

                {showNow ? (
                  <div
                    className="pointer-events-none absolute z-10"
                    style={{
                      top: (nowH - DAY_START_HOUR) * HOUR_ROW_PX,
                      insetInlineStart: 0,
                      insetInlineEnd: 0,
                      borderTop: "2px solid var(--red)",
                    }}
                  >
                    <span
                      className="absolute -top-2 rounded px-1.5 py-px text-[10px] font-bold text-white"
                      style={{ background: "var(--red)", insetInlineStart: 2 }}
                    >
                      {t("appointments.now")}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AppointmentBlock({
  appointment: a,
  label,
  lang,
  onClick,
}: {
  appointment: AppointmentResponse;
  label: AppointmentLabel;
  lang: string;
  onClick?: () => void;
}) {
  const start = new Date(a.scheduledAt);
  const dur = a.durationMin ?? DEFAULT_DURATION_MIN;
  const top = Math.max(0, (hoursSinceMidnight(start) - DAY_START_HOUR) * HOUR_ROW_PX);
  const height = Math.max(22, (dur / 60) * HOUR_ROW_PX - 4);
  const compact = height < 48;
  const tone = appointmentBlockTone(a.status);
  const cancelled = a.status === "cancelled";

  return (
    <div
      onClick={(e) => {
        e.stopPropagation(); // don't let a block click fall through to the column's "book slot"
        onClick?.();
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "absolute overflow-hidden rounded-lg px-2 py-1 text-start",
        onClick && "cursor-pointer transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      style={{
        top: top + 2,
        insetInlineStart: 4,
        insetInlineEnd: 4,
        height,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.text,
      }}
    >
      <div className="flex items-baseline gap-1">
        <span className="text-[10px] font-semibold tabular-nums opacity-80">
          {formatDate(start, lang, "HH:mm")}
        </span>
        <span className={cn("truncate text-xs font-bold leading-tight", cancelled && "line-through")}>
          {label.primary}
        </span>
      </div>
      {!compact && label.secondary ? (
        <div className="truncate text-[11px] leading-tight opacity-85">{label.secondary}</div>
      ) : null}
      {!compact && label.doctorName ? (
        <div className="mt-1 flex items-center gap-1">
          <span
            className="grid size-4 shrink-0 place-items-center rounded text-[9px] font-bold text-white"
            style={{ background: tone.text }}
          >
            {doctorInitials(label.doctorName)}
          </span>
          <span className="truncate text-[10px]">{label.doctorName}</span>
        </div>
      ) : null}
    </div>
  );
}
