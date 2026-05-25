import { useMemo } from "react";

import type { ProductResponse } from "@vet/shared";

import { useProducts } from "@/queries/products";

/**
 * id → product map for resolving product names on screens that carry only `productId` (inventory
 * movement, field-visit medications). Loads one page of the catalog (modest for a single center);
 * like `useCustomerLookup`/`useDoctorOptions` this isolates the lookup behind one hook.
 */
export function useProductLookup(): {
  byId: Map<string, ProductResponse>;
  isLoading: boolean;
} {
  const q = useProducts({ take: 200 });
  return useMemo(() => {
    const byId = new Map((q.data ?? []).map((p) => [p.id, p] as const));
    return { byId, isLoading: q.isLoading };
  }, [q.data, q.isLoading]);
}
