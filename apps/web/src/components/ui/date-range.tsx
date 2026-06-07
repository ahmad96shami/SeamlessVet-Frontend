import { formatDate } from "@vet/shared";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * A date range that reads correctly in both directions: each date keeps LTR digits,
 * while the connecting arrow follows the layout direction (points left in RTL).
 */
export function DateRange({
  start,
  end,
  className,
}: {
  start: string;
  end?: string | null;
  className?: string;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  if (!end) {
    return (
      <span dir="ltr" className={className}>
        {formatDate(start, lang)}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span dir="ltr">{formatDate(start, lang)}</span>
      <Icon.arrowRight className="size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100" />
      <span dir="ltr">{formatDate(end, lang)}</span>
    </span>
  );
}
