import { formatDate, formatDateTime } from "@vet/shared";
import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Custom date / date-time picker — drop-in replacement for `<input type="date">` and
 * `<input type="datetime-local">`.
 *
 * - `value` format mirrors the native control: `"YYYY-MM-DD"` (date-only) or
 *   `"YYYY-MM-DDTHH:mm"` (when `withTime`). RHF `{...register("x")}` still works.
 * - `onChange` emits `{ target: { value } }` — same shape as `Select`.
 * - The trigger reuses `.select-trigger` so it inherits the form-control styling.
 * - The popup is portalled to `<body>` and pinned to the trigger; if there isn't enough
 *   space below, it flips *above* the trigger so it doesn't get clipped inside a tall
 *   modal (this caught us on the new-product expiry field — see [[web-polish-pass-decisions]]).
 * - Month / weekday labels come from `Intl.DateTimeFormat`; numbers are forced Latin via
 *   the shared `formatDate` so output stays consistent with the rest of the app.
 */
export interface DatePickerProps {
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
  disabled?: boolean;
  /** Inclusive lower bound, `YYYY-MM-DD` (or with time when `withTime`). */
  min?: string;
  /** Inclusive upper bound. */
  max?: string;
  placeholder?: string;
  /** When true, picks a date *and* time (`YYYY-MM-DDTHH:mm` value). */
  withTime?: boolean;
  /** Step in minutes for the minute selector when `withTime`. Default 5. */
  minuteStep?: number;
  className?: string;
  containerClassName?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toIsoDateTime(d: Date): string {
  return `${toIsoDate(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function parseValue(s: string | undefined, withTime: boolean): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const hh = withTime ? Number(m[4] ?? "0") : 0;
  const mm = withTime ? Number(m[5] ?? "0") : 0;
  const d = new Date(y, mo, day, hh, mm);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function addYears(d: Date, n: number): Date {
  return new Date(d.getFullYear() + n, d.getMonth(), 1);
}

/** How many years the year-picker grid shows at once (3 columns × 4 rows). */
const YEAR_PAGE = 12;

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function withDate(target: Date, from: Date): Date {
  return new Date(target.getFullYear(), target.getMonth(), target.getDate(), from.getHours(), from.getMinutes());
}

function withTimeParts(d: Date, hh: number, mm: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm);
}

export function DatePicker({
  value,
  onChange,
  disabled,
  min,
  max,
  placeholder,
  withTime = false,
  minuteStep = 5,
  className,
  containerClassName,
  id,
  name,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const selected = parseValue(value, withTime);
  const minDate = parseValue(min, withTime);
  const maxDate = parseValue(max, withTime);

  const [open, setOpen] = React.useState(false);
  // The calendar body toggles between the day grid and a year-picker grid (tap the title).
  const [mode, setMode] = React.useState<"days" | "years">("days");
  const [viewMonth, setViewMonth] = React.useState<Date>(() => startOfMonth(selected ?? new Date()));
  const [focusedDay, setFocusedDay] = React.useState<Date>(() => selected ?? new Date());
  const [draftTime, setDraftTime] = React.useState<{ h: number; m: number }>(() => {
    const d = selected ?? new Date();
    return { h: d.getHours(), m: Math.floor(d.getMinutes() / minuteStep) * minuteStep };
  });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number; flipUp: boolean } | null>(null);

  const reposition = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const popupHeight = popupRef.current?.getBoundingClientRect().height ?? 360;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    // Flip up when the popup doesn't fit below AND there's more room above.
    const flipUp = spaceBelow < popupHeight + 8 && spaceAbove > spaceBelow;
    const top = flipUp ? rect.top - popupHeight - 4 : rect.bottom + 4;
    setPos({ top, left: rect.left, width: rect.width, flipUp });
  }, []);

  // Callback ref: re-measure once the portalled popup is in the DOM — first pass uses the 360px
  // fallback so without this the flip-up math overshoots when the real popup is shorter.
  const setPopupRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      popupRef.current = el;
      if (el) reposition();
    },
    [reposition],
  );

  React.useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const onMove = () => reposition();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, reposition]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const openCalendar = () => {
    if (disabled) return;
    const initial = selected ?? new Date();
    setMode("days");
    setViewMonth(startOfMonth(initial));
    setFocusedDay(initial);
    if (withTime) {
      setDraftTime({ h: initial.getHours(), m: Math.floor(initial.getMinutes() / minuteStep) * minuteStep });
    }
    setOpen(true);
  };

  const isDisabledDate = (d: Date): boolean => {
    if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate(), 23, 59)) return true;
    return false;
  };

  const choose = (d: Date) => {
    if (isDisabledDate(d)) return;
    if (withTime) {
      // In time mode, picking a day doesn't close — let the user confirm via "Done" so they
      // can tweak the time first. We still update the focused day + draft.
      setFocusedDay(d);
      return;
    }
    const iso = toIsoDate(d);
    if (iso !== value) onChange?.({ target: { value: iso } });
    setOpen(false);
    triggerRef.current?.focus();
  };

  const confirmWithTime = () => {
    const d = withTimeParts(focusedDay, draftTime.h, draftTime.m);
    const iso = toIsoDateTime(d);
    if (iso !== value) onChange?.({ target: { value: iso } });
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openCalendar();
    }
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    // The year grid is plain buttons — let native focus/click/Enter handle it; only Escape (above)
    // is intercepted here.
    if (mode === "years") return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (withTime) confirmWithTime();
      else choose(focusedDay);
      return;
    }
    let next: Date | null = null;
    if (e.key === "ArrowLeft") next = new Date(focusedDay.getFullYear(), focusedDay.getMonth(), focusedDay.getDate() - 1);
    else if (e.key === "ArrowRight") next = new Date(focusedDay.getFullYear(), focusedDay.getMonth(), focusedDay.getDate() + 1);
    else if (e.key === "ArrowUp") next = new Date(focusedDay.getFullYear(), focusedDay.getMonth(), focusedDay.getDate() - 7);
    else if (e.key === "ArrowDown") next = new Date(focusedDay.getFullYear(), focusedDay.getMonth(), focusedDay.getDate() + 7);
    else if (e.key === "PageUp") next = addMonths(focusedDay, -1);
    else if (e.key === "PageDown") next = addMonths(focusedDay, 1);
    else if (e.key === "Home") next = new Date(focusedDay.getFullYear(), focusedDay.getMonth(), 1);
    else if (e.key === "End") next = new Date(focusedDay.getFullYear(), focusedDay.getMonth() + 1, 0);
    if (next) {
      e.preventDefault();
      setFocusedDay(withDate(next, focusedDay));
      if (next.getMonth() !== viewMonth.getMonth() || next.getFullYear() !== viewMonth.getFullYear()) {
        setViewMonth(startOfMonth(next));
      }
    }
  };

  const weekStart = locale.startsWith("ar") ? 6 : 0; // 0=Sun, 6=Sat
  const dayNameFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 7 + ((weekStart + i) % 7));
    return dayNameFormatter.format(d);
  });

  // `-u-nu-latn` keeps Arabic month names but forces Latin digits for the year (app-wide rule).
  const monthLabel = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    month: "long",
    year: "numeric",
  }).format(viewMonth);
  const today = new Date();

  // Year-picker grid: a YEAR_PAGE window aligned to a decade boundary so the header chevrons page
  // cleanly by ±YEAR_PAGE. Year numbers render via `String` → always Latin digits.
  const viewYear = viewMonth.getFullYear();
  const yearBase = Math.floor(viewYear / YEAR_PAGE) * YEAR_PAGE;
  const yearCells = Array.from({ length: YEAR_PAGE }, (_, i) => yearBase + i);
  const yearRangeLabel = `${yearBase} – ${yearBase + YEAR_PAGE - 1}`;
  const highlightYear = (withTime ? focusedDay : selected)?.getFullYear();

  const firstOfView = startOfMonth(viewMonth);
  const leading = (firstOfView.getDay() - weekStart + 7) % 7;
  const gridStart = new Date(firstOfView.getFullYear(), firstOfView.getMonth(), 1 - leading);
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => {
    return new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
  });

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => i * minuteStep);

  const display = selected
    ? withTime
      ? formatDateTime(selected, locale)
      : formatDate(selected, locale)
    : (placeholder ?? t(withTime ? "datepicker.placeholderDateTime" : "datepicker.placeholder"));

  return (
    <div className={cn("relative", containerClassName)}>
      <button
        type="button"
        ref={triggerRef}
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-open={open || undefined}
        className={cn("select-trigger", className)}
        onClick={() => (open ? setOpen(false) : openCalendar())}
        onKeyDown={onTriggerKey}
      >
        <span className={cn("select-value", !selected && "placeholder")}>{display}</span>
        <Icon.cal className="select-chev size-4" />
      </button>
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      {open && pos
        ? createPortal(
            <div
              ref={setPopupRef}
              role="dialog"
              aria-label={ariaLabel}
              className="datepicker-popup"
              style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: pos.width }}
              onKeyDown={onGridKey}
              tabIndex={-1}
            >
              <div className="datepicker-head">
                <button
                  type="button"
                  className="datepicker-nav"
                  aria-label={mode === "years" ? "Previous years" : "Previous month"}
                  onClick={() =>
                    setViewMonth((m) => (mode === "years" ? addYears(m, -YEAR_PAGE) : addMonths(m, -1)))
                  }
                >
                  <Icon.chevronRight className="size-4" />
                </button>
                {/* Tap the title to switch to / from the year picker. */}
                <button
                  type="button"
                  className="datepicker-title"
                  aria-label="Select year"
                  onClick={() => setMode((mo) => (mo === "years" ? "days" : "years"))}
                >
                  {mode === "years" ? yearRangeLabel : monthLabel}
                </button>
                <button
                  type="button"
                  className="datepicker-nav"
                  aria-label={mode === "years" ? "Next years" : "Next month"}
                  onClick={() =>
                    setViewMonth((m) => (mode === "years" ? addYears(m, YEAR_PAGE) : addMonths(m, 1)))
                  }
                >
                  <Icon.chevronLeft className="size-4" />
                </button>
              </div>
              {mode === "years" ? (
                <div className="datepicker-year-grid" role="grid">
                  {yearCells.map((y) => {
                    const yDis = Boolean(
                      (minDate && y < minDate.getFullYear()) || (maxDate && y > maxDate.getFullYear()),
                    );
                    return (
                      <button
                        key={y}
                        type="button"
                        role="gridcell"
                        disabled={yDis}
                        aria-selected={highlightYear === y}
                        data-today={y === today.getFullYear() || undefined}
                        data-selected={highlightYear === y || undefined}
                        className="datepicker-year"
                        onClick={() => {
                          setViewMonth((m) => new Date(y, m.getMonth(), 1));
                          setMode("days");
                        }}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              ) : (
              <div className="datepicker-grid" role="grid">
                {weekdays.map((w, i) => (
                  <div key={`w${i}`} className="datepicker-weekday">
                    {w}
                  </div>
                ))}
                {cells.map((d) => {
                  const inMonth = d.getMonth() === viewMonth.getMonth();
                  // In time mode the committed `value` only changes on "Done", so highlight the
                  // draft day (`focusedDay` — what "Done" will commit) to give immediate feedback
                  // when a day is clicked. In date-only mode highlight the committed value.
                  const isSelected = withTime ? isSameDay(d, focusedDay) : selected ? isSameDay(d, selected) : false;
                  const isFocused = isSameDay(d, focusedDay);
                  const isToday = isSameDay(d, today);
                  const isDis = isDisabledDate(d);
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      role="gridcell"
                      tabIndex={isFocused ? 0 : -1}
                      aria-selected={isSelected}
                      aria-disabled={isDis || undefined}
                      disabled={isDis}
                      data-in-month={inMonth || undefined}
                      data-today={isToday || undefined}
                      data-selected={isSelected || undefined}
                      className="datepicker-day"
                      onClick={() => choose(d)}
                      onFocus={() => setFocusedDay(d)}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
              )}
              {withTime ? (
                <div className="datepicker-time">
                  <span className="datepicker-time-label">{t("datepicker.time")}</span>
                  <select
                    className="datepicker-time-select"
                    value={draftTime.h}
                    aria-label={t("datepicker.hour")}
                    onChange={(e) => setDraftTime((s) => ({ ...s, h: Number(e.target.value) }))}
                  >
                    {hourOptions.map((h) => (
                      <option key={h} value={h}>
                        {pad2(h)}
                      </option>
                    ))}
                  </select>
                  <span>:</span>
                  <select
                    className="datepicker-time-select"
                    value={draftTime.m}
                    aria-label={t("datepicker.minute")}
                    onChange={(e) => setDraftTime((s) => ({ ...s, m: Number(e.target.value) }))}
                  >
                    {minuteOptions.map((m) => (
                      <option key={m} value={m}>
                        {pad2(m)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="datepicker-foot">
                <button
                  type="button"
                  className="datepicker-action"
                  onClick={() => {
                    setMode("days");
                    setViewMonth(startOfMonth(today));
                    setFocusedDay(today);
                    if (withTime) setDraftTime({ h: today.getHours(), m: Math.floor(today.getMinutes() / minuteStep) * minuteStep });
                  }}
                >
                  {t("datepicker.today")}
                </button>
                {value ? (
                  <button
                    type="button"
                    className="datepicker-action"
                    onClick={() => {
                      onChange?.({ target: { value: "" } });
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    {t("datepicker.clear")}
                  </button>
                ) : null}
                {withTime ? (
                  <button
                    type="button"
                    className="datepicker-action datepicker-action-primary"
                    onClick={confirmWithTime}
                  >
                    {t("datepicker.done")}
                  </button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
