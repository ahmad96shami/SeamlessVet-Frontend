import { useMemo } from "react";

import { useInvoices } from "@/queries/invoices";

/**
 * Ids of the visit's prescriptions / procedures / vaccinations (M22) / night stays (M23) already
 * billed on an invoice, plus whether the visit's checkup fee is billed. The invoice item back-links
 * ARE the billed flag (no separate column) — the same derivation the server's BilledChargeGuard
 * enforces, so the UI can disable remove/re-price before the 409 would. Back-links on VOID invoices
 * count too (matching the server: voiding reverses the money but keeps the clinical row frozen).
 */
export function useBilledChargeIds(visitId: string) {
  const invoices = useInvoices({ visitId, take: 50 });

  return useMemo(() => {
    const prescriptions = new Set<string>();
    const procedures = new Set<string>();
    const vaccinations = new Set<string>();
    const nightStays = new Set<string>();
    let checkupFee = false;
    for (const inv of invoices.data ?? []) {
      for (const it of inv.items) {
        if (it.prescriptionId) prescriptions.add(it.prescriptionId);
        if (it.procedureId) procedures.add(it.procedureId);
        if (it.vaccinationId) vaccinations.add(it.vaccinationId);
        if (it.nightStayId) nightStays.add(it.nightStayId);
        if (it.checkupFeeVisitId) checkupFee = true;
      }
    }
    return { prescriptions, procedures, vaccinations, nightStays, checkupFee };
  }, [invoices.data]);
}
