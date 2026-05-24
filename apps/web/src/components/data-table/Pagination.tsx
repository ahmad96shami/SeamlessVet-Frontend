import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface PaginationProps {
  /** 1-based page number, for display. */
  page: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

/** Offset pager controls. The list endpoints return bare arrays (no total), so it's prev/next only. */
export function Pagination({ page, canPrev, canNext, onPrev, onNext }: PaginationProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-2 pt-3">
      <span className="text-sm text-muted-foreground">{t("admin.common.page", { page })}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={!canPrev}>
          {/* Logical arrows: "previous" points toward the start of the reading direction. */}
          <Icon.chevronRight className="size-4 ltr:hidden" />
          <Icon.chevronLeft className="size-4 rtl:hidden" />
          {t("admin.common.previous")}
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={!canNext}>
          {t("admin.common.next")}
          <Icon.chevronLeft className="size-4 ltr:hidden" />
          <Icon.chevronRight className="size-4 rtl:hidden" />
        </Button>
      </div>
    </div>
  );
}
