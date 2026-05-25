import { useMemo } from "react";

import type { CustomerResponse } from "@vet/shared";

import { useCustomers } from "@/queries/customers";

/**
 * id → customer map for resolving customer names on the finance screens (contracts/batches carry only
 * `customerId`). Loads one page of the roster (modest for a single center); like `useDoctorOptions`
 * this isolates the lookup so a dedicated batch-resolve endpoint could replace it later.
 */
export function useCustomerLookup(): {
  byId: Map<string, CustomerResponse>;
  isLoading: boolean;
} {
  const q = useCustomers({ take: 200 });
  return useMemo(() => {
    const byId = new Map((q.data ?? []).map((c) => [c.id, c] as const));
    return { byId, isLoading: q.isLoading };
  }, [q.data, q.isLoading]);
}
