import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useCustomer } from "@/queries/customers";
import { useInvoices } from "@/queries/invoices";
import { usePrescriptions } from "@/queries/prescriptions";
import { useProcedures } from "@/queries/procedures";
import { useProducts } from "@/queries/products";
import { useServices } from "@/queries/services";
import { useVisit } from "@/queries/visits";
import { usePosCartStore } from "@/stores/posCartStore";

import { CustomerPickerDialog } from "./CustomerPickerDialog";
import { VisitPickerDialog, visitRef } from "./VisitPickerDialog";

/**
 * The visit's UNBILLED dispensed-to-owner prescriptions + procedures — exactly what the server
 * bills at issuance. Anything already on a non-void invoice for the visit is filtered out (the
 * server de-dups via the prescription/procedure back-links); names/prices resolve via catalog maps.
 */
function useVisitCharges(visitId: string) {
  const rx = usePrescriptions(visitId);
  const procs = useProcedures(visitId);
  const invoices = useInvoices({ visitId, take: 50 });
  const products = useProducts({ take: 200 });
  const services = useServices({ take: 200 });

  return useMemo(() => {
    const productById = new Map((products.data ?? []).map((p) => [p.id, p]));
    const serviceName = new Map((services.data ?? []).map((s) => [s.id, s.nameAr]));

    const billedRx = new Set<string>();
    const billedProc = new Set<string>();
    for (const inv of invoices.data ?? []) {
      if (inv.status === "void") continue;
      for (const it of inv.items) {
        if (it.prescriptionId) billedRx.add(it.prescriptionId);
        if (it.procedureId) billedProc.add(it.procedureId);
      }
    }

    const prescriptions = (rx.data ?? [])
      .filter((p) => p.dispenseType === "dispensed_to_owner" && !billedRx.has(p.id))
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
        name: (p.serviceId && serviceName.get(p.serviceId)) || "—",
        price: p.price,
      }));

    return {
      prescriptions,
      procedures,
      isLoading: rx.isLoading || procs.isLoading || invoices.isLoading,
    };
  }, [rx.data, rx.isLoading, procs.data, procs.isLoading, invoices.data, invoices.isLoading, products.data, services.data]);
}

/**
 * Mirrors the linked visit's unbilled charges into the cart as LOCKED lines (keyed by the
 * prescription/procedure id): visible and price/discount-editable like any line, but not removable
 * and with the quantity fixed — that is edited on the visit, and the server enforces it at
 * issuance regardless. Renders nothing; the store merge keeps the cashier's edits across refetches.
 */
function VisitLinesSync({ visitId }: { visitId: string }) {
  const { prescriptions, procedures, isLoading } = useVisitCharges(visitId);
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
    ]);
  }, [isLoading, prescriptions, procedures, syncVisitLines]);

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
