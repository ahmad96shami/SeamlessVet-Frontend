import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Wraps the design's `.input` (index.css @layer components): 10px radius, teal focus ring.
 *
 * For `type="number"` controlled inputs, a `0` value renders as the empty string so the placeholder
 * shows instead of literal "0". Without this, typing into an input that already shows "0" produces
 * "01"/"10" before React reconciles. The change is display-only — callers must still treat the
 * onChange empty-string input as 0 (e.g. `Number(e.target.value) || 0`, or RHF `setValueAs`).
 */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, value, onFocus, ...props }, ref) => {
    const display = type === "number" && (value === 0 || value === "0") ? "" : value;
    // Suppress a leading "0" on focus for both controlled and uncontrolled number inputs — RHF
    // hydrates with "0" on the DOM; controlled inputs already display empty via [[display]].
    // Browsers don't honor `.select()` on type=number, so we clear the DOM value directly. Empty
    // is unambiguous since the parent's onChange treats "" as 0 (`Number(v) || 0` / setValueAs).
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (type === "number" && e.target.value === "0") e.target.value = "";
      onFocus?.(e);
    };
    return (
      <input
        type={type}
        ref={ref}
        className={cn("input", className)}
        onFocus={handleFocus}
        {...(display !== undefined ? { value: display } : {})}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
