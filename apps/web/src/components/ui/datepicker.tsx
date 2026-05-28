import { formatDate } from "@vet/shared";
import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Custom date picker — a drop-in replacement for `<input type="date" />`.
 *
 * - `value` is `"YYYY-MM-DD"` (the native input value format), so RHF
 *   `{...register("date")}` keeps working when callers swap.
 * - `onChange` emits `{ target: { value } }` (same shape as `Select`).
 * - Visual trigger reuses the `.select-trigger` class so spacing, focus ring,
 *   and disabled state match the rest of the form controls.
 * - Calendar popup is portalled to `<body>` and pinned to the trigger via the
 *   same `useLayoutEffect` pattern as `Select`, so it never clips inside
 *   scrolling dialogs.
 * - Month / weekday labels come from `Intl.DateTimeFormat` in the active
 *   language — no per-component i18n strings.
 */
export interface DatePickerProps {
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
  disabled?: boolean;
  /** Inclusive lower bound, `YYYY-MM-DD`. */
  min?: string;
  /** Inclusive upper bound, `YYYY-MM-DD`. */
  max?: string;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDate(s: string | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DatePicker({
  value,
  onChange,
  disabled,
  min,
  max,
  placeholder,
  className,
  containerClassName,
  id,
  name,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const selected = parseIsoDate(value);
  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);

  const [open, setOpen] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState<Date>(() => startOfMonth(selected ?? new Date()));
  const [focusedDay, setFocusedDay] = React.useState<Date>(() => selected ?? new Date());
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);

  const reposition = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

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
    setViewMonth(startOfMonth(initial));
    setFocusedDay(initial);
    setOpen(true);
  };

  const isDisabledDate = (d: Date): boolean => {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  const choose = (d: Date) => {
    if (isDisabledDate(d)) return;
    const iso = toIsoDate(d);
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
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(focusedDay);
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
      setFocusedDay(next);
      if (next.getMonth() !== viewMonth.getMonth() || next.getFullYear() !== viewMonth.getFullYear()) {
        setViewMonth(startOfMonth(next));
      }
    }
  };

  // 7×6 grid starting on Saturday (week start for ar-PS); en-US starts Sunday.
  // Intl exposes neither week-start nor day names directly in older runtimes,
  // so we derive both from concrete dates: pick any Saturday and march forward.
  const weekStart = locale.startsWith("ar") ? 6 : 0; // 0=Sun, 6=Sat
  const dayNameFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 7 + ((weekStart + i) % 7)); // 2024-01-07 is a Sunday
    return dayNameFormatter.format(d);
  });

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(viewMonth);
  const today = new Date();

  const firstOfView = startOfMonth(viewMonth);
  const leading = (firstOfView.getDay() - weekStart + 7) % 7;
  const gridStart = new Date(firstOfView.getFullYear(), firstOfView.getMonth(), 1 - leading);
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => {
    return new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
  });

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
        <span className={cn("select-value", !selected && "placeholder")}>
          {selected ? formatDate(selected, locale) : (placeholder ?? "—")}
        </span>
        <Icon.cal className="select-chev size-4" />
      </button>
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      {open && pos
        ? createPortal(
            <div
              ref={popupRef}
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
                  aria-label="Previous month"
                  onClick={() => setViewMonth((m) => addMonths(m, -1))}
                >
                  <Icon.chevronRight className="size-4" />
                </button>
                <span className="datepicker-title">{monthLabel}</span>
                <button
                  type="button"
                  className="datepicker-nav"
                  aria-label="Next month"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                >
                  <Icon.chevronLeft className="size-4" />
                </button>
              </div>
              <div className="datepicker-grid" role="grid">
                {weekdays.map((w, i) => (
                  <div key={`w${i}`} className="datepicker-weekday">
                    {w}
                  </div>
                ))}
                {cells.map((d) => {
                  const inMonth = d.getMonth() === viewMonth.getMonth();
                  const isSelected = selected ? isSameDay(d, selected) : false;
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
              <div className="datepicker-foot">
                <button
                  type="button"
                  className="datepicker-action"
                  onClick={() => {
                    setViewMonth(startOfMonth(today));
                    setFocusedDay(today);
                  }}
                >
                  {locale.startsWith("ar") ? "اليوم" : "Today"}
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
                    {locale.startsWith("ar") ? "مسح" : "Clear"}
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
