import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { parkedSales } from "@/services/parkedSales";
import { usePosCartStore, type ParkedSale } from "@/stores/posCartStore";

const KEY = "parked-sales";

/** The parked-sale list (most-recent first) — backs both the resume drawer and its count badge. */
export function useParkedSales() {
  return useQuery<ParkedSale[]>({
    queryKey: [KEY],
    queryFn: () => parkedSales.list(),
    staleTime: 0,
  });
}

/** Park the current cart under a caller-resolved label, then refresh the list. */
export function useParkSale() {
  const qc = useQueryClient();
  const park = usePosCartStore((s) => s.park);
  return useMutation({
    mutationFn: (label: string) => park(label),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Resume a parked sale into the cart and consume it (a held sale resumes at most once). */
export function useResumeParkedSale() {
  const qc = useQueryClient();
  const resume = usePosCartStore((s) => s.resume);
  return useMutation({
    mutationFn: async (sale: ParkedSale) => {
      resume(sale);
      await parkedSales.remove(sale.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Discard a parked sale without resuming it. */
export function useDeleteParkedSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => parkedSales.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
