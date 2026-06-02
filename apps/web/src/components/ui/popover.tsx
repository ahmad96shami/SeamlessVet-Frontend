import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Lightweight portalled popover — same anchoring pattern as `Select`/`DatePicker`. The trigger is
 * any element; clicking it toggles a panel anchored under the trigger (or flipped above when it
 * doesn't fit). Closes on outside click and Esc. No focus trap (these are quick action panels).
 */
export interface PopoverProps {
  /** The clickable anchor (e.g. a Button). */
  trigger: React.ReactNode;
  /** Panel contents — wraps in a styled `.popover-panel` shell. */
  children: React.ReactNode | ((args: { close: () => void }) => React.ReactNode);
  className?: string;
  /** Visual alignment of the panel relative to the trigger's inline-start edge. */
  align?: "start" | "end" | "center";
  /** Optional fixed width. Defaults to the trigger's width. */
  panelWidth?: number;
}

export function Popover({ trigger, children, className, align = "start", panelWidth }: PopoverProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);

  const reposition = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 200;
    const panelW = panelWidth ?? Math.max(rect.width, 220);
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flipUp = spaceBelow < panelHeight + 8 && spaceAbove > spaceBelow;
    const top = flipUp ? Math.max(8, rect.top - panelHeight - 4) : rect.bottom + 4;
    let left: number;
    if (align === "end") left = rect.right - panelW;
    else if (align === "center") left = rect.left + (rect.width - panelW) / 2;
    else left = rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - panelW - 8));
    setPos({ top, left, width: panelW });
  }, [align, panelWidth]);

  // Callback ref: re-run reposition the moment the portalled panel attaches and we know its real
  // height — without this the first measurement uses the 200px fallback and flip-up lands too high.
  const setPanelRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      panelRef.current = el;
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
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <span ref={triggerRef} onClick={() => setOpen((v) => !v)} className="inline-flex">
        {trigger}
      </span>
      {open && pos
        ? createPortal(
            <div
              ref={setPanelRef}
              style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 60 }}
              className={cn(
                "popover-panel rounded-xl border bg-card p-3 shadow-[var(--shadow-popover)]",
                className,
              )}
            >
              {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
