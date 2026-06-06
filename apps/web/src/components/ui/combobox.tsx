import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  /** Plain string — rendered in the trigger and matched by the search filter. */
  label: string;
  /** Muted suffix shown next to the label in the menu (e.g. unit of measure). */
  sublabel?: string;
  /** Extra haystack for the filter (e.g. the Latin name) — never rendered. */
  keywords?: string;
}

export interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  /** Trigger text while nothing is selected. */
  placeholder?: string;
  disabled?: boolean;
  /**
   * Renders a pinned "add new" row under the results; fired with the current search term.
   * The caller opens its create-dialog from this (the menu closes itself first).
   */
  onCreateNew?: (term: string) => void;
  /**
   * Server-searched mode: the options are already filtered for the current term, so the
   * internal filter is skipped. Pair with {@link ComboboxProps.onTermChange}.
   */
  serverFiltered?: boolean;
  /** Reports search-term changes — the caller debounces it into its query. */
  onTermChange?: (term: string) => void;
  /**
   * Trigger label for the current value when the options list may not contain it (server-searched
   * lists shrink to the matches, but the selection must keep its label).
   */
  selectedLabel?: string;
  className?: string;
  /** Sizes the trigger wrapper (e.g. `w-48`); defaults to full width. */
  containerClassName?: string;
  "aria-label"?: string;
}

/**
 * Searchable {@link import("./select").Select}: same trigger/menu styling and portal+flip
 * positioning, plus a filter input pinned at the top of the menu and an optional "add new"
 * action row for create-from-search flows (the visit procedure/prescription pickers).
 * Keyboard: ↑/↓ move, Enter selects, Esc closes (stopped — it must not close a host dialog).
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  onCreateNew,
  serverFiltered,
  onTermChange,
  selectedLabel,
  className,
  containerClassName,
  "aria-label": ariaLabel,
}: ComboboxProps) {
  const { t } = useTranslation();
  const selected = options.find((o) => o.value === value);
  const triggerLabel = value ? (selectedLabel ?? selected?.label) : undefined;

  const [open, setOpen] = React.useState(false);
  const [term, setTerm] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);

  const needle = term.trim().toLowerCase();
  const filtered =
    needle && !serverFiltered
      ? options.filter((o) => `${o.label} ${o.sublabel ?? ""} ${o.keywords ?? ""}`.toLowerCase().includes(needle))
      : options;
  // The "add new" row sits after the results; it participates in keyboard navigation.
  const createIndex = onCreateNew ? filtered.length : -1;
  const lastIndex = onCreateNew ? filtered.length : filtered.length - 1;

  const reposition = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < menuHeight + 8 && rect.top > spaceBelow;
    const top = flipUp ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4;
    setPos({ top, left: rect.left, width: rect.width });
  }, []);

  const setMenuRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      menuRef.current = el;
      if (el) {
        reposition();
        inputRef.current?.focus();
      }
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
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the active row visible during keyboard navigation.
  React.useEffect(() => {
    if (!open) return;
    menuRef.current
      ?.querySelectorAll<HTMLElement>('[role="option"]')
      ?.[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const openMenu = () => {
    if (disabled) return;
    setTerm("");
    onTermChange?.("");
    const current = options.findIndex((o) => o.value === value);
    setActiveIndex(current >= 0 ? current : 0);
    setOpen(true);
  };

  const close = (refocusTrigger: boolean) => {
    setOpen(false);
    if (refocusTrigger) triggerRef.current?.focus();
  };

  const chooseIndex = (i: number) => {
    if (i === createIndex) {
      close(false); // the caller opens a dialog — leave focus to it
      onCreateNew?.(term.trim());
      return;
    }
    const opt = filtered[i];
    if (!opt) return;
    if (opt.value !== value) onChange(opt.value);
    close(true);
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      // Only the menu closes — never the dialog hosting this combobox.
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (lastIndex < 0 ? i : Math.min(i + 1, lastIndex)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      chooseIndex(activeIndex);
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu();
    }
  };

  return (
    <div className={cn("relative", containerClassName)}>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-open={open || undefined}
        className={cn("select-trigger", className)}
        onClick={() => (open ? close(true) : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={cn("select-value", !triggerLabel && !selected && "placeholder")}>
          {triggerLabel ?? selected?.label ?? placeholder ?? ""}
        </span>
        <Icon.chevronDown className="select-chev size-4" />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={setMenuRef}
              className="select-menu flex flex-col"
              style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, overflowY: "hidden" }}
            >
              <div className="relative shrink-0 pb-1.5">
                <Icon.search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-400)]" />
                <input
                  ref={inputRef}
                  value={term}
                  onChange={(e) => {
                    setTerm(e.target.value);
                    onTermChange?.(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={onInputKeyDown}
                  placeholder={t("combobox.search")}
                  aria-label={t("combobox.search")}
                  className="input h-9 w-full ps-8"
                />
              </div>
              <ul role="listbox" className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0">
                {filtered.length === 0 ? (
                  <li className="px-2.5 py-2 text-sm text-muted-foreground">{t("combobox.noResults")}</li>
                ) : (
                  filtered.map((opt, i) => (
                    <li
                      key={`${opt.value}-${i}`}
                      role="option"
                      aria-selected={opt.value === value}
                      data-active={i === activeIndex || undefined}
                      data-selected={opt.value === value || undefined}
                      className="select-option"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => chooseIndex(i)}
                    >
                      {/* Flex gap, not an inline margin: ms-* on the sublabel resolves against its
                          own dir="auto" direction, so an LTR sublabel (phone, Latin unit) in the RTL
                          list put the gap on its outer side — name and sublabel ran together. */}
                      <span className="flex min-w-0 items-baseline gap-1.5">
                        <span className="min-w-0 truncate">{opt.label}</span>
                        {opt.sublabel ? (
                          <span dir="auto" className="flex-none text-xs text-muted-foreground">
                            {opt.sublabel}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))
                )}
                {onCreateNew ? (
                  <li
                    role="option"
                    aria-selected={false}
                    data-active={activeIndex === createIndex || undefined}
                    className="select-option mt-0.5 border-t border-[var(--ink-100)] font-medium text-[var(--teal-700)]"
                    onMouseEnter={() => setActiveIndex(createIndex)}
                    onClick={() => chooseIndex(createIndex)}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Icon.plus className="size-4 shrink-0" />
                      <span className="truncate">
                        {needle ? t("combobox.addNamed", { term: term.trim() }) : t("combobox.addNew")}
                      </span>
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
