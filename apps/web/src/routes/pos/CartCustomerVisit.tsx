import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { VisitResponse } from "@vet/shared";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useCustomer } from "@/queries/customers";
import { useParkSale, useParkedSales } from "@/queries/parkedSales";
import { useVisit } from "@/queries/visits";
import { usePosCartStore } from "@/stores/posCartStore";

import { CustomerPickerDialog } from "./CustomerPickerDialog";
import { ParkedSalesDialog } from "./ParkedSalesDialog";
import { useVisitCharges } from "./useVisitCharges";
import { VisitChargesConfirmDialog } from "./VisitChargesConfirmDialog";
import { VisitPickerDialog, visitRef } from "./VisitPickerDialog";

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
        kind: "product" as const,
        refId: v.productId,
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
  const navigate = useNavigate();
  const customerId = usePosCartStore((s) => s.customerId);
  const visitId = usePosCartStore((s) => s.visitId);
  const hasLines = usePosCartStore((s) => s.lines.length > 0);
  const setCustomer = usePosCartStore((s) => s.setCustomer);
  const linkVisit = usePosCartStore((s) => s.linkVisit);
  const clearVisit = usePosCartStore((s) => s.clearVisit);
  const clear = usePosCartStore((s) => s.clear);

  const [pickCustomer, setPickCustomer] = useState(false);
  const [pickVisit, setPickVisit] = useState(false);
  const [showParked, setShowParked] = useState(false);
  // The visit awaiting a charge-confirm (W19.2): picked from the list, not yet linked to the cart.
  const [pendingVisit, setPendingVisit] = useState<VisitResponse | null>(null);

  const customer = useCustomer(customerId);
  const visit = useVisit(visitId);

  const park = useParkSale();
  const parkedCount = useParkedSales().data?.length ?? 0;
  // Park is meaningful whenever there's something to resume later — lines or just a linked visit.
  const hasSomethingToBill = hasLines || visitId !== null;

  const onPark = () => {
    // Resolve the resume-list label here (the customer name is loaded); fall back to a short id.
    const label = customerId
      ? (customer.data?.fullName ?? `#${customerId.slice(0, 8)}`)
      : t("pos.park.walkIn");
    park.mutate(label, { onSuccess: () => toast.success(t("pos.park.success")) });
  };

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
            <>
              <LinkChip
                icon={<Icon.link className="size-3.5 flex-none text-muted-foreground" aria-hidden />}
                label={visit.data ? visitRef(visit.data) : `#${visitId.slice(0, 8)}`}
                ltr
                onClear={clearVisit}
                clearLabel={t("pos.link.clear")}
              />
              {/* Jump back to the visit this sale was rung up from (the cart state is kept). */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/operations/visits/${visitId}`)}
              >
                <Icon.stethoscope className="size-4" />
                {t("pos.link.openVisit")}
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setPickVisit(true)}>
              <Icon.link className="size-4" />
              {t("pos.link.linkVisit")}
            </Button>
          )
        ) : null}

        {/* Park / resume / clear — pushed to the row's far (visually left) end. Resume stays
            reachable even on an empty cart (so a held sale can come back); Park appears once
            there's something to hold; Clear empties lines AND links. */}
        <div className="ms-auto flex items-center gap-1">
          {parkedCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowParked(true)}
              className="h-7 gap-1 px-2 text-xs"
            >
              <Icon.inbox className="size-3.5" />
              {t("pos.park.parked")}
              <span className="rounded-full bg-ink-100 px-1.5 text-[11px] font-bold tabular-nums">
                {parkedCount}
              </span>
            </Button>
          ) : null}
          {hasSomethingToBill ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onPark}
              disabled={park.isPending}
              className="h-7 gap-1 px-2 text-xs"
            >
              <Icon.clock className="size-3.5" />
              {t("pos.park.action")}
            </Button>
          ) : null}
          {hasLines ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <Icon.trash className="size-3.5" />
              {t("pos.cart.clear")}
            </Button>
          ) : null}
        </div>
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
          // W19.2: picking a visit opens a charge-confirm prompt; linking happens on confirm.
          onSelect={(v) => {
            setPickVisit(false);
            setPendingVisit(v);
          }}
        />
      ) : null}
      {pendingVisit ? (
        <VisitChargesConfirmDialog
          visit={pendingVisit}
          onClose={() => setPendingVisit(null)}
          onConfirm={() => {
            linkVisit(pendingVisit.id, pendingVisit.customerId);
            setPendingVisit(null);
          }}
        />
      ) : null}
      <ParkedSalesDialog open={showParked} onClose={() => setShowParked(false)} />
    </div>
  );
}
