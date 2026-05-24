import { useCallback, useState } from "react";

/**
 * Offset pagination state for admin lists. The list endpoints return bare arrays with no total
 * count, so "has next page" is derived by the screen from whether a full page came back
 * (`rows.length === take`). Reset to page 0 whenever filters/search change.
 */
export function useOffsetPager(pageSize = 20) {
  const [page, setPage] = useState(0); // 0-based

  const next = useCallback(() => setPage((p) => p + 1), []);
  const prev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const reset = useCallback(() => setPage(0), []);

  return {
    page,
    pageSize,
    skip: page * pageSize,
    take: pageSize,
    canPrev: page > 0,
    next,
    prev,
    reset,
  };
}
