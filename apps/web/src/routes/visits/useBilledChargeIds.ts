import { useMemo } from "react";

import { useInvoices } from "@/queries/invoices";

/**
 * Ids of the visit's prescriptions / procedures / vaccinations (M22) already billed on a non-void
 * invoice. The invoice item back-links ARE the billed flag (no separate column) — the same
 * derivation the server's BilledChargeGuard enforces, so the UI can disable remove/re-price before
 * the 409 would.
 */
export function useBilledChargeIds(visitId: string) {
  const invoices = useInvoices({ visitId, take: 50 });

  return useMemo(() => {
    const prescriptions = new Set<string>();
    const procedures = new Set<string>();
    const vaccinations = new Set<string>();
    for (const inv of invoices.data ?? []) {
      if (inv.status === "void") continue;
      for (const it of inv.items) {
        if (it.prescriptionId) prescriptions.add(it.prescriptionId);
        if (it.procedureId) procedures.add(it.procedureId);
        if (it.vaccinationId) vaccinations.add(it.vaccinationId);
      }
    }
    return { prescriptions, procedures, vaccinations };
  }, [invoices.data]);
}
