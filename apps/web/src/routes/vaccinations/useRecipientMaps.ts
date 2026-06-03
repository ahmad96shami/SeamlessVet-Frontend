import { useMemo } from "react";

import { useCustomerLookup } from "@/hooks/useCustomerLookup";
import { usePets } from "@/queries/pets";

import type { RecipientMaps } from "./recipient";

/**
 * Capped customer + pet reference maps for resolving vaccination recipients to names (the
 * AppointmentsPage precedent — one page of each list, modest for a single center).
 */
export function useRecipientMaps(): RecipientMaps & { isLoading: boolean } {
  const customers = useCustomerLookup();
  const pets = usePets({ take: 200 });
  const petById = useMemo(
    () => new Map((pets.data ?? []).map((p) => [p.id, p] as const)),
    [pets.data],
  );
  return {
    customerById: customers.byId,
    petById,
    isLoading: customers.isLoading || pets.isLoading,
  };
}
