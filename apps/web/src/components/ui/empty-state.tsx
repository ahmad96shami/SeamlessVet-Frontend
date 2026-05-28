import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Consistent empty-state block for tables/cards — icon chip + title + optional body. */
export function EmptyState({
  icon,
  title,
  body,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-10 text-center", className)}>
      {icon ? (
        <div className="grid size-10 place-items-center rounded-full bg-[var(--ink-50)] text-[var(--ink-500)]">
          {icon}
        </div>
      ) : null}
      <div className="text-sm font-semibold text-[var(--fg-strong)]">{title}</div>
      {body ? <div className="max-w-sm text-xs text-[var(--ink-500)]">{body}</div> : null}
    </div>
  );
}
