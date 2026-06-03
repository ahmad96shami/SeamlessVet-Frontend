import { formatDate, type VaccinationResponse } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  addDays,
  addMonths,
  isClosedDay,
  isToday,
  startOfDay,
  viewRange,
  weekDays,
  CALENDAR_VIEWS,
  type CalendarView,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { useVaccinationCalendar } from "@/queries/vaccinations";
import { resolveRecipient } from "@/routes/vaccinations/recipient";
import { StandaloneVaccinationDialog } from "@/routes/vaccinations/StandaloneVaccinationDialog";
import { useRecipientMaps } from "@/routes/vaccinations/useRecipientMaps";

const pad2 = (n: number) => String(n).padStart(2, "0");
/** Local date → "yyyy-MM-dd" (the DateOnly shape /vaccinations/upcoming filters `nextDueDate` by). */
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const MAX_CHIPS = 3;

/**
 * Upcoming-vaccinations calendar (W13). Reuses the W5 calendar date math (`lib/calendar`) + the
 * navigation chrome, but vaccinations are date-only (a `nextDueDate`, no time), so the month view is a
 * date grid and day/week are an agenda — not the appointments hour-grid. Drilling a month day opens
 * the day view; clicking a vaccination opens its edit dialog.
 */
export function VaccinationCalendarPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [editing, setEditing] = useState<VaccinationResponse | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const days = useMemo(() => viewRange(view, anchor).days, [view, anchor]);
  const from = toISODate(days[0] ?? anchor);
  const to = toISODate(days[days.length - 1] ?? anchor);

  // Pass an explicit range so any window (incl. past months on drill-back) loads — `from` only
  // defaults to today server-side when omitted.
  const query = useVaccinationCalendar({ from, to, take: 200 });
  const items = query.data ?? [];
  const maps = useRecipientMaps();

  const byDay = useMemo(() => {
    const m = new Map<string, VaccinationResponse[]>();
    for (const v of items) {
      if (!v.nextDueDate) continue;
      const key = v.nextDueDate.slice(0, 10);
      const list = m.get(key);
      if (list) list.push(v);
      else m.set(key, [v]);
    }
    return m;
  }, [items]);

  const itemsOn = (d: Date) => byDay.get(toISODate(d)) ?? [];
  const recipientName = (v: VaccinationResponse) => {
    const r = resolveRecipient(v, maps);
    return r.name ?? (r.isFarmGroup ? t("vaccinations.recipientFarm") : t("vaccinations.recipientUnknown"));
  };
  const openVaccination = (v: VaccinationResponse) => {
    setEditing(v);
    setEditingLabel(recipientName(v));
    setFormOpen(true);
  };

  const shift = (dir: -1 | 1) =>
    setAnchor((a) =>
      view === "month" ? addMonths(a, dir) : view === "week" ? addDays(a, 7 * dir) : addDays(a, dir),
    );
  const openDay = (d: Date) => {
    setAnchor(startOfDay(d));
    setView("day");
  };

  const rangeLabel = useMemo(() => {
    if (view === "day") return formatDate(anchor, lang, "EEEE، d MMMM yyyy");
    if (view === "month") return formatDate(anchor, lang, "MMMM yyyy");
    const d = weekDays(anchor);
    const a = d[0] ?? anchor;
    const b = d[d.length - 1] ?? a;
    return a.getMonth() === b.getMonth()
      ? `${formatDate(a, lang, "d")} – ${formatDate(b, lang, "d MMMM yyyy")}`
      : `${formatDate(a, lang, "d MMM")} – ${formatDate(b, lang, "d MMM yyyy")}`;
  }, [view, anchor, lang]);

  return (
    <div className="space-y-4">
      {/* View switcher + date navigation (mirrors the W5 appointments chrome) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border p-1">
          {CALENDAR_VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-bold transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`appointments.view.${v}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnchor(startOfDay(new Date()))}>
            {t("appointments.today")}
          </Button>
          <button
            type="button"
            className="icon-pill"
            aria-label={t("appointments.prev")}
            onClick={() => shift(-1)}
          >
            <Icon.chevronRight className="size-4 ltr:hidden" />
            <Icon.chevronLeft className="size-4 rtl:hidden" />
          </button>
          <button
            type="button"
            className="icon-pill"
            aria-label={t("appointments.next")}
            onClick={() => shift(1)}
          >
            <Icon.chevronLeft className="size-4 ltr:hidden" />
            <Icon.chevronRight className="size-4 rtl:hidden" />
          </button>
          <span className="min-w-40 text-sm font-bold tabular-nums" dir="auto">
            {rangeLabel}
          </span>
        </div>
      </div>

      <div className="card flush relative overflow-hidden">
        {query.isLoading ? (
          <div className="grid h-64 place-items-center">
            <Icon.spinner className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : view === "month" ? (
          <MonthView
            days={days}
            month={anchor.getMonth()}
            itemsOn={itemsOn}
            recipientName={recipientName}
            onSelectDay={openDay}
            moreLabel={(n) => t("vaccinations.calendar.more", { count: n })}
          />
        ) : (
          <Agenda
            days={days}
            itemsOn={itemsOn}
            recipientName={recipientName}
            onSelectVaccination={openVaccination}
            emptyLabel={t("vaccinations.calendar.empty")}
          />
        )}
      </div>

      {!query.isLoading && items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          {t("vaccinations.calendar.empty")}
        </p>
      ) : null}

      {formOpen ? (
        <StandaloneVaccinationDialog
          open
          vaccination={editing}
          recipientLabel={editingLabel}
          onClose={() => setFormOpen(false)}
        />
      ) : null}
    </div>
  );
}

/** Month overview: a 6×7 date grid; each cell lists the day's due vaccinations and drills in on click. */
function MonthView({
  days,
  month,
  itemsOn,
  recipientName,
  onSelectDay,
  moreLabel,
}: {
  days: Date[];
  month: number;
  itemsOn: (d: Date) => VaccinationResponse[];
  recipientName: (v: VaccinationResponse) => string;
  onSelectDay: (d: Date) => void;
  moreLabel: (n: number) => string;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
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
          const list = itemsOn(day);
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
                {list.slice(0, MAX_CHIPS).map((v) => (
                  <div
                    key={v.id}
                    className="truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight"
                    style={{
                      background: "var(--teal-soft, #d8f1f3)",
                      color: "#0a6b75",
                      border: "1px solid rgba(18,154,170,0.35)",
                    }}
                  >
                    <span>{v.vaccineType}</span>{" "}
                    <span className="opacity-80">· {recipientName(v)}</span>
                  </div>
                ))}
                {list.length > MAX_CHIPS ? (
                  <span className="ps-1 text-[10px] font-semibold text-muted-foreground">
                    {moreLabel(list.length - MAX_CHIPS)}
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

/** Day/week agenda: one column per day, each listing that day's due vaccinations as cards. */
function Agenda({
  days,
  itemsOn,
  recipientName,
  onSelectVaccination,
  emptyLabel,
}: {
  days: Date[];
  itemsOn: (d: Date) => VaccinationResponse[];
  recipientName: (v: VaccinationResponse) => string;
  onSelectVaccination: (v: VaccinationResponse) => void;
  emptyLabel: string;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
    >
      {days.map((day, i) => {
        const list = itemsOn(day);
        return (
          <div
            key={day.toISOString()}
            className={cn("min-h-[16rem] border-s p-2", i === 0 && "border-s-0")}
            style={{ background: isClosedDay(day) ? "var(--paper-soft)" : undefined }}
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-xs font-bold text-muted-foreground">
                {formatDate(day, lang, days.length > 1 ? "EEE" : "EEEE")}
              </span>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                  isToday(day) ? "bg-teal-500 text-white" : "text-[var(--fg-strong)]",
                )}
              >
                {formatDate(day, lang, "d")}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {list.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                list.map((v) => (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => onSelectVaccination(v)}
                    className="rounded-lg border p-2 text-start transition-colors hover:bg-[var(--paper-soft)]"
                    style={{ borderColor: "rgba(18,154,170,0.35)" }}
                  >
                    <span className="block truncate text-sm font-semibold">{v.vaccineType}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {recipientName(v)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
      {days.every((d) => itemsOn(d).length === 0) ? (
        <p
          className="col-span-full py-8 text-center text-sm text-muted-foreground"
          style={{ gridColumn: "1 / -1" }}
        >
          {emptyLabel}
        </p>
      ) : null}
    </div>
  );
}
