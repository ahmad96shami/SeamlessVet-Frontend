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
 * A visit's billable charges, split into UNBILLED (what the server will bill at issuance) and BILLED
 * (already on an invoice or posted by the completion backstop). Both are billable prescriptions
 * (dispensed-to-owner + M23 billable in-clinic), procedures, catalog-linked vaccinations (M26), and
 * the checkup fee + closed night stays.
 *
 * - **Unbilled** drives the POS cart's active LOCKED lines (VisitLinesSync) and the W19 confirm dialog.
 *   Care charges (checkup fee / night stays) appear only while the visit is `in_progress` — an open
 *   visit hasn't confirmed the fee (بدء الكشف), and a completed visit's were already settled.
 * - **Billed** drives the POS cart's greyed «مُفوترة» reference lines (0 to the total, never re-sent).
 *   rx/proc/vax come from invoice back-links (their only writer); the care charges use the server's
 *   authoritative `billed` flags (`night_stay.billed` / `visit.checkupFeeBilled`), which also catch
 *   the completion backstop — so a COMPLETED visit still shows its billed checkup fee + night stays,
 *   which is exactly what makes a re-rung visit's already-billed charges visible instead of vanishing.
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

    // Invoice back-links are the billed flag for rx/proc/vax (these have NO completion-backstop
    // writer, so the invoice is the whole story). Void back-links count too (server treats them billed).
    const billedRx = new Set<string>();
    const billedProc = new Set<string>();
    const billedVax = new Set<string>();
    for (const inv of invoices.data ?? []) {
      for (const it of inv.items) {
        if (it.prescriptionId) billedRx.add(it.prescriptionId);
        if (it.procedureId) billedProc.add(it.procedureId);
        if (it.vaccinationId) billedVax.add(it.vaccinationId);
      }
    }

    const mapRx = (p: NonNullable<typeof rx.data>[number]) => {
      const product = productById.get(p.productId);
      return {
        id: p.id,
        productId: p.productId,
        name: product?.nameAr ?? "—",
        unit: product?.unitOfMeasure ?? undefined,
        unitPrice: product?.sellingPrice ?? 0,
        quantity: p.quantity ?? 1,
      };
    };
    const billableRx = (rx.data ?? []).filter(
      (p) =>
        p.dispenseType === "dispensed_to_owner" ||
        (p.dispenseType === "administered_in_clinic" && p.billable),
    );

    const mapProc = (p: NonNullable<typeof procs.data>[number]) => ({
      id: p.id,
      serviceId: p.serviceId!,
      name: (p.serviceId && serviceById.get(p.serviceId)?.nameAr) || "—",
      price: p.price,
    });
    const allProcs = (procs.data ?? []).filter((p) => p.serviceId != null);

    // Only catalog-linked vaccinations bill; legacy free-text rows are clinical records only.
    const mapVax = (vc: NonNullable<typeof vax.data>[number]) => ({
      id: vc.id,
      productId: vc.productId!,
      name: vc.vaccineType || productById.get(vc.productId!)?.nameAr || "—",
      price: vc.price ?? productById.get(vc.productId!)?.sellingPrice ?? 0,
    });
    const allVax = (vax.data ?? []).filter((vc) => vc.productId != null);

    const v = visit.data;
    const inClinic = v?.visitType === "in_clinic";
    // Care charges are offered as billable only mid-visit (M23); billed ones show regardless of status.
    const careChargesActive = inClinic && v?.status === "in_progress";
    const feeAmount = v?.checkupFeeApplied ?? 0;
    const feeBilled = v?.checkupFeeBilled ?? false; // server flag — invoice back-link OR backstop

    const mapStay = (s: NonNullable<typeof stays.data>[number]) => ({
      id: s.id,
      name: t(`careType.${s.careType}`, { defaultValue: t("pos.visitLine.nightStay") }),
      nights: s.nightsCount,
      rate: s.nightlyRate,
    });

    const checkupFee =
      careChargesActive && !feeBilled && feeAmount > 0
        ? { visitId: v!.id, name: t("pos.visitLine.checkupFee"), price: feeAmount }
        : null;

    const nightStays = careChargesActive
      ? (stays.data ?? [])
          .filter((s) => !s.billed && s.checkOutAt != null && s.nightsCount > 0 && s.total > 0)
          .map(mapStay)
      : [];

    // Already-billed counterparts — reference-only «مُفوترة» lines in the POS cart (see the doc above).
    const billed = {
      prescriptions: billableRx.filter((p) => billedRx.has(p.id)).map(mapRx),
      procedures: allProcs.filter((p) => billedProc.has(p.id)).map(mapProc),
      vaccinations: allVax.filter((vc) => billedVax.has(vc.id)).map(mapVax),
      checkupFee:
        inClinic && feeBilled && feeAmount > 0
          ? { visitId: v!.id, name: t("pos.visitLine.checkupFee"), price: feeAmount }
          : null,
      nightStays: (stays.data ?? []).filter((s) => s.billed).map(mapStay),
    };

    return {
      prescriptions: billableRx.filter((p) => !billedRx.has(p.id)).map(mapRx),
      procedures: allProcs.filter((p) => !billedProc.has(p.id)).map(mapProc),
      vaccinations: allVax.filter((vc) => !billedVax.has(vc.id)).map(mapVax),
      checkupFee,
      nightStays,
      billed,
      isLoading:
        visit.isLoading || rx.isLoading || procs.isLoading || vax.isLoading ||
        stays.isLoading || invoices.isLoading,
    };
  }, [visit.data, visit.isLoading, rx.data, rx.isLoading, procs.data, procs.isLoading, vax.data, vax.isLoading, stays.data, stays.isLoading, invoices.data, invoices.isLoading, products.data, services.data, t]);
}
