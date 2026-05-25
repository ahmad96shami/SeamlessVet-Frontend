import * as React from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface OptionData {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

/**
 * Custom dropdown — a drop-in replacement for the native `<select>`: it reads `<option>` children
 * and emits an `onChange` shaped like the native one (`{ target: { value } }`), so existing call
 * sites (`onChange={(e) => setX(e.target.value)}`) work unchanged. The menu is portalled to
 * `<body>` (fixed-positioned under the trigger) so it never clips inside scrollable dialogs and
 * paints above them. RTL-safe; keyboard: ↑/↓ move, Enter/Space select, Esc closes.
 * (Full focus-trap / type-ahead polish lands in W10.)
 */
export interface SelectProps {
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  /** Sizes the trigger wrapper (e.g. `w-48`); defaults to full width. */
  containerClassName?: string;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  "aria-label"?: string;
}

function readOptions(children: React.ReactNode): OptionData[] {
  const out: OptionData[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.type !== "option") return;
    const props = child.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
    out.push({ value: String(props.value ?? ""), label: props.children ?? "", disabled: props.disabled });
  });
  return out;
}

function nextEnabled(options: OptionData[], from: number, dir: 1 | -1): number {
  const n = options.length;
  if (n === 0) return -1;
  for (let step = 1; step <= n; step++) {
    const i = (from + dir * step + n) % n;
    if (!options[i]?.disabled) return i;
  }
  return from;
}

export function Select({
  value,
  onChange,
  disabled,
  children,
  className,
  containerClassName,
  id,
  name,
  autoFocus,
  "aria-label": ariaLabel,
}: SelectProps) {
  const options = readOptions(children);
  const selected = options.find((o) => o.value === value) ?? options[0];

  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLUListElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);

  const reposition = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  // Keep the portalled menu pinned to the trigger while open (page/dialog scroll, resize).
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

  // Close on outside pointer-down.
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

  // Scroll the active option into view during keyboard nav.
  React.useEffect(() => {
    if (!open || activeIndex < 0) return;
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    items?.[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const openMenu = () => {
    if (disabled) return;
    const current = options.findIndex((o) => o.value === value);
    setActiveIndex(current >= 0 ? current : nextEnabled(options, -1, 1));
    setOpen(true);
  };

  const choose = (opt: OptionData | undefined) => {
    if (!opt || opt.disabled) return;
    if (opt.value !== value) onChange?.({ target: { value: opt.value } });
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => nextEnabled(options, i, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => nextEnabled(options, i, -1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(options[activeIndex]);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className={cn("relative", containerClassName)}>
      <button
        type="button"
        ref={triggerRef}
        id={id}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-open={open || undefined}
        className={cn("select-trigger", className)}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={cn("select-value", !selected?.value && "placeholder")}>{selected?.label ?? ""}</span>
        <Icon.chevronDown className="select-chev size-4" />
      </button>
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      {open && pos
        ? createPortal(
            <ul
              ref={menuRef}
              role="listbox"
              className="select-menu"
              style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
            >
              {options.map((opt, i) => (
                <li
                  key={`${opt.value}-${i}`}
                  role="option"
                  aria-selected={opt.value === value}
                  aria-disabled={opt.disabled || undefined}
                  data-active={i === activeIndex || undefined}
                  data-selected={opt.value === value || undefined}
                  className="select-option"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(opt)}
                >
                  <span>{opt.label}</span>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
