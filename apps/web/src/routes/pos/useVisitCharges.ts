import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useInvoices } from "@/queries/invoices";
import { useNightStays } from "@/queries/nightStays";
import { usePrescriptions } from "@/queries/prescriptions";
import { useProcedures } from "@/queries/procedures";
import { useProducts } from "@/queries/products";
import { useServices } from "@/queries/services";
import { useVaccinations } from "@/queries/vaccinations";
import { useVisit } from "@/queries/visits";

/**
 * The visit's UNBILLED billable charges — exactly what the server bills at issuance: billable
 * prescriptions (dispensed-to-owner + M23 billable in-clinic), procedures, catalog-linked
 * vaccinations (M26 — vaccine products), and — while the visit is in_progress (M23) — its checkup fee and closed
 * night stays. Anything already back-linked on ANY invoice is filtered out (void included — the
 * server treats voided back-links as billed too); a completed visit's care charges never mirror
 * (completion backstopped whatever the till didn't bill). Names/prices resolve via catalog maps.
 *
 * Drives both the POS cart's LOCKED visit lines (VisitLinesSync) and the W19 confirm dialog.
 */
export function useVisitCharges(visitId: string) {
  const { t } = useTranslation();
  const visit = useVisit(visitId);
  const rx = usePrescriptions(visitId);
  const procs = useProcedures(visitId);
  const vax = useVaccinations({ visitId, take: 200 });
  const stays = useNightStays(visitId);
  const invoices = useInvoices({ visitId, take: 50 });
  const products = useProducts({ take: 200 });
  const services = useServices({ take: 200 });

  return useMemo(() => {
    const productById = new Map((products.data ?? []).map((p) => [p.id, p]));
    const serviceById = new Map((services.data ?? []).map((s) => [s.id, s]));

    const billedRx = new Set<string>();
    const billedProc = new Set<string>();
    const billedVax = new Set<string>();
    const billedStays = new Set<string>();
    let billedFee = false;
    for (const inv of invoices.data ?? []) {
      for (const it of inv.items) {
        if (it.prescriptionId) billedRx.add(it.prescriptionId);
        if (it.procedureId) billedProc.add(it.procedureId);
        if (it.vaccinationId) billedVax.add(it.vaccinationId);
        if (it.nightStayId) billedStays.add(it.nightStayId);
        if (it.checkupFeeVisitId) billedFee = true;
      }
    }

    const prescriptions = (rx.data ?? [])
      .filter(
        (p) =>
          (p.dispenseType === "dispensed_to_owner" ||
            (p.dispenseType === "administered_in_clinic" && p.billable)) &&
          !billedRx.has(p.id),
      )
      .map((p) => {
        const product = productById.get(p.productId);
        return {
          id: p.id,
          productId: p.productId,
          name: product?.nameAr ?? "—",
          unit: product?.unitOfMeasure ?? undefined,
          unitPrice: product?.sellingPrice ?? 0,
          quantity: p.quantity ?? 1,
        };
      });

    const procedures = (procs.data ?? [])
      .filter((p) => p.serviceId != null && !billedProc.has(p.id))
      .map((p) => ({
        id: p.id,
        serviceId: p.serviceId!,
        name: (p.serviceId && serviceById.get(p.serviceId)?.nameAr) || "—",
        price: p.price,
      }));

    // Only catalog-linked vaccinations bill; legacy free-text rows are clinical records only.
    // M26: a vaccine is a product, so the locked line is a product line (back-linked by vaccinationId).
    const vaccinations = (vax.data ?? [])
      .filter((v) => v.productId != null && !billedVax.has(v.id))
      .map((v) => ({
        id: v.id,
        productId: v.productId!,
        name: v.vaccineType || productById.get(v.productId!)?.nameAr || "—",
        price: v.price ?? productById.get(v.productId!)?.sellingPrice ?? 0,
      }));

    // M23 care charges — only while in_progress: an open visit's fee isn't confirmed yet
    // (بدء الكشف), and a completed visit's charges were already settled (invoice or backstop —
    // the backstop's ledger keys aren't visible here, so completed visits must not re-offer them).
    const v = visit.data;
    const careChargesActive = v?.visitType === "in_clinic" && v.status === "in_progress";

    const checkupFee =
      careChargesActive && !billedFee && (v.checkupFeeApplied ?? 0) > 0
        ? { visitId: v.id, name: t("pos.visitLine.checkupFee"), price: v.checkupFeeApplied! }
        : null;

    const nightStays = careChargesActive
      ? (stays.data ?? [])
          .filter((s) => s.checkOutAt != null && s.nightsCount > 0 && s.total > 0 && !billedStays.has(s.id))
          .map((s) => ({
            id: s.id,
            name: t(`careType.${s.careType}`, { defaultValue: t("pos.visitLine.nightStay") }),
            nights: s.nightsCount,
            rate: s.nightlyRate,
          }))
      : [];

    return {
      prescriptions,
      procedures,
      vaccinations,
      checkupFee,
      nightStays,
      isLoading:
        visit.isLoading || rx.isLoading || procs.isLoading || vax.isLoading ||
        stays.isLoading || invoices.isLoading,
    };
  }, [visit.data, visit.isLoading, rx.data, rx.isLoading, procs.data, procs.isLoading, vax.data, vax.isLoading, stays.data, stays.isLoading, invoices.data, invoices.isLoading, products.data, services.data, t]);
}
