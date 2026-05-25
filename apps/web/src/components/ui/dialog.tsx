import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Lightweight modal: portal + overlay, closes on Escape / overlay click, locks body scroll.
 * `role="dialog"` + `aria-modal`, with a focus-trap (W10 a11y pass): focus moves into the dialog on
 * open, Tab/Shift+Tab cycle within it, and focus returns to the previously-focused element on close.
 */
export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const { t } = useTranslation();
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const content = contentRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !content) return;
      const focusables = Array.from(content.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) {
        e.preventDefault();
        content.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !content.contains(active)) {
          e.preventDefault();
          last?.focus();
        }
      } else if (active === last || !content.contains(active)) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog once it's painted (first focusable, else the panel itself).
    const raf = requestAnimationFrame(() => {
      const first = content?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? content)?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative z-10 max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-card p-6 shadow-[var(--shadow-pop)] outline-none",
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-navy-900">{title}</h2>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t("actions.close")}
            className="-me-2 -mt-2 shrink-0"
          >
            <Icon.close className="size-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
