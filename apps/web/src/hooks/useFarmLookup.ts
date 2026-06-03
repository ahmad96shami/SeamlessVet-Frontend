import { useMemo } from "react";

import type { FarmResponse } from "@vet/shared";

import { useFarms } from "@/queries/farms";

/**
 * id → farm map for resolving farm names where rows carry only `farmId` (e.g. the visit-profit
 * reports). Loads one page of the center's farms (modest for a single center); like
 * `useCustomerLookup` this isolates the lookup so a batch-resolve endpoint could replace it later.
 */
export function useFarmLookup(): {
  byId: Map<string, FarmResponse>;
  isLoading: boolean;
} {
  const q = useFarms({ take: 200 });
  return useMemo(() => {
    const byId = new Map((q.data ?? []).map((f) => [f.id, f] as const));
    return { byId, isLoading: q.isLoading };
  }, [q.data, q.isLoading]);
}
