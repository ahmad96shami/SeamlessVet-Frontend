import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useCustomer } from "@/queries/customers";
import { useInvoices } from "@/queries/invoices";
import { useNightStays } from "@/queries/nightStays";
import { usePrescriptions } from "@/queries/prescriptions";
import { useProcedures } from "@/queries/procedures";
import { useProducts } from "@/queries/products";
import { useServices } from "@/queries/services";
import { useVaccinations } from "@/queries/vaccinations";
import { useVisit } from "@/queries/visits";
import { usePosCartStore } from "@/stores/posCartStore";

import { CustomerPickerDialog } from "./CustomerPickerDialog";
import { VisitPickerDialog, visitRef } from "./VisitPickerDialog";

/**
 * The visit's UNBILLED billable charges — exactly what the server bills at issuance: billable
 * prescriptions (dispensed-to-owner + M23 billable in-clinic), procedures, catalog-linked
 * vaccinations (M22), and — while the visit is in_progress (M23) — its checkup fee and closed
 * night stays. Anything already back-linked on ANY invoice is filtered out (void included — the
 * server treats voided back-links as billed too); a completed visit's care charges never mirror
 * (completion backstopped whatever the till didn't bill). Names/prices resolve via catalog maps.
 */
function useVisitCharges(visitId: string) {
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
    const vaccinations = (vax.data ?? [])
      .filter((v) => v.serviceId != null && !billedVax.has(v.id))
      .map((v) => ({
        id: v.id,
        serviceId: v.serviceId!,
        name: v.vaccineType || serviceById.get(v.serviceId!)?.nameAr || "—",
        price: v.price ?? serviceById.get(v.serviceId!)?.defaultPrice ?? 0,
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

/**
 * Mirrors the linked visit's unbilled charges into the cart as LOCKED lines (keyed by the
 * prescription/procedure id): visible and price/discount-editable like any line, but not removable
 * and with the quantity fixed — that is edited on the visit, and the server enforces it at
 * issuance regardless. Renders nothing; the store merge keeps the cashier's edits across refetches.
 */
function VisitLinesSync({ visitId }: { visitId: string }) {
  const { prescriptions, procedures, vaccinations, checkupFee, nightStays, isLoading } =
    useVisitCharges(visitId);
  const syncVisitLines = usePosCartStore((s) => s.syncVisitLines);

  useEffect(() => {
    if (isLoading) return;
    syncVisitLines([
      ...prescriptions.map((p) => ({
        key: p.id,
        kind: "product" as const,
        refId: p.productId,
        name: p.name,
        unit: p.unit,
        unitPrice: p.unitPrice,
        quantity: p.quantity,
        discountAmount: 0,
        prescriptionId: p.id,
      })),
      ...procedures.map((p) => ({
        key: p.id,
        kind: "service" as const,
        refId: p.serviceId,
        name: p.name,
        unitPrice: p.price,
        quantity: 1,
        discountAmount: 0,
        procedureId: p.id,
      })),
      ...vaccinations.map((v) => ({
        key: v.id,
        kind: "service" as const,
        refId: v.serviceId,
        name: v.name,
        unitPrice: v.price,
        quantity: 1,
        discountAmount: 0,
        vaccinationId: v.id,
      })),
      // M23 care charges — synthetic refIds: these lines send NO productId/serviceId at issue
      // (CartIssue omits them; the server resolves the system service from the back-link).
      ...(checkupFee
        ? [{
            key: `checkup-${checkupFee.visitId}`,
            kind: "service" as const,
            refId: `checkup-${checkupFee.visitId}`,
            name: checkupFee.name,
            unitPrice: checkupFee.price,
            quantity: 1,
            discountAmount: 0,
            checkupFeeVisitId: checkupFee.visitId,
          }]
        : []),
      ...nightStays.map((s) => ({
        key: s.id,
        kind: "service" as const,
        refId: s.id,
        name: s.name,
        unitPrice: s.rate,
        quantity: s.nights, // server-wins (the stay's hotel-rule night count)
        discountAmount: 0,
        nightStayId: s.id,
      })),
    ]);
  }, [isLoading, prescriptions, procedures, vaccinations, checkupFee, nightStays, syncVisitLines]);

  return null;
}

/** A removable link chip — the compact "linked customer / linked visit" token in the cart header. */
function LinkChip({
  icon,
  label,
  ltr,
  onClear,
  clearLabel,
}: {
  icon: ReactNode;
  label: string;
  /** Visit refs are Latin (#V-…) — isolate them so they render cleanly inside the RTL row. */
  ltr?: boolean;
  onClear: () => void;
  clearLabel: string;
}) {
  return (
    <span className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-full border bg-[var(--paper-soft)] pe-1.5 ps-2.5 text-[13px] font-medium text-navy-900">
      {icon}
      <span className="truncate" dir={ltr ? "ltr" : undefined}>
        {label}
      </span>
      <button
        type="button"
        onClick={onClear}
        aria-label={clearLabel}
        className="grid size-5 flex-none place-items-center rounded-full text-muted-foreground transition-colors hover:bg-ink-100 hover:text-destructive"
      >
        <Icon.close className="size-3" />
      </button>
    </span>
  );
}

/** Cart header: walk-in vs. a linked customer, and an optional linked visit (whose unbilled charges
 *  auto-assemble at issuance). One chips row — customer chip + visit chip/action — instead of the
 *  old stacked label/value blocks, so the header costs the cart a single line. */
export function CartCustomerVisit() {
  const { t } = useTranslation();
  const customerId = usePosCartStore((s) => s.customerId);
  const visitId = usePosCartStore((s) => s.visitId);
  const hasLines = usePosCartStore((s) => s.lines.length > 0);
  const setCustomer = usePosCartStore((s) => s.setCustomer);
  const linkVisit = usePosCartStore((s) => s.linkVisit);
  const clearVisit = usePosCartStore((s) => s.clearVisit);
  const clear = usePosCartStore((s) => s.clear);

  const [pickCustomer, setPickCustomer] = useState(false);
  const [pickVisit, setPickVisit] = useState(false);

  const customer = useCustomer(customerId);
  const visit = useVisit(visitId);

  return (
    <div className="flex-none space-y-2 border-b p-3">
      <div className="flex flex-wrap items-center gap-2">
        {customerId ? (
          <LinkChip
            icon={<Icon.user className="size-3.5 flex-none text-muted-foreground" aria-hidden />}
            label={customer.data?.fullName ?? "…"}
            onClear={() => setCustomer(null)}
            clearLabel={t("pos.link.clear")}
          />
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={() => setPickCustomer(true)}>
            <Icon.user className="size-4" />
            {t("pos.link.selectCustomer")}
          </Button>
        )}
        {customerId ? (
          visitId ? (
            <LinkChip
              icon={<Icon.link className="size-3.5 flex-none text-muted-foreground" aria-hidden />}
              label={visit.data ? visitRef(visit.data) : `#${visitId.slice(0, 8)}`}
              ltr
              onClear={clearVisit}
              clearLabel={t("pos.link.clear")}
            />
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setPickVisit(true)}>
              <Icon.link className="size-4" />
              {t("pos.link.linkVisit")}
            </Button>
          )
        ) : null}
        {/* Empty-the-cart, on the row's far (visually left) end — clears lines AND links. */}
        {hasLines ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="ms-auto h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <Icon.trash className="size-3.5" />
            {t("pos.cart.clear")}
          </Button>
        ) : null}
      </div>

      {visitId ? <VisitLinesSync visitId={visitId} /> : null}

      <CustomerPickerDialog
        open={pickCustomer}
        onClose={() => setPickCustomer(false)}
        onSelect={(c) => {
          setCustomer(c.id);
          setPickCustomer(false);
        }}
      />
      {customerId ? (
        <VisitPickerDialog
          open={pickVisit}
          onClose={() => setPickVisit(false)}
          customerId={customerId}
          onSelect={(v) => {
            linkVisit(v.id, v.customerId);
            setPickVisit(false);
          }}
        />
      ) : null}
    </div>
  );
}
