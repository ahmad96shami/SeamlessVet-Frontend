import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Sizes the wrapper (so the chevron stays aligned); the select is always full-width within it. */
  containerClassName?: string;
}

/**
 * Styled native `<select>` — RTL-safe (logical padding/positioning), matches `Input`. Native keeps
 * it dependency-free and accessible; the chevron is decorative (`pointer-events-none`). Size it via
 * `containerClassName` (e.g. `w-44`); it defaults to full width.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, containerClassName, children, ...props }, ref) => (
    <div className={cn("relative", containerClassName)}>
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pe-9 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted-foreground" />
    </div>
  ),
);
Select.displayName = "Select";
