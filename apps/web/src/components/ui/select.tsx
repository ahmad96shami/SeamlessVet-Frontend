import * as React from "react";

import { Icon } from "@/components/ui/icon";
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
      <select ref={ref} className={cn("select appearance-none pe-9", className)} {...props}>
        {children}
      </select>
      <Icon.chevronDown className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted-foreground" />
    </div>
  ),
);
Select.displayName = "Select";
