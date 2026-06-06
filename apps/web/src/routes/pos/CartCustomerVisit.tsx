import { formatQuantity } from "@vet/shared";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/ui/money";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
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
 * auto-assembles at issuance. Anything already on a non-void invoice for the visit is filtered out
 * (the server de-dups via the prescription/procedure back-links); names resolve via catalog maps.
 */
function useVisitCharges(visitId: string) {
  const rx = usePrescriptions(visitId);
  const procs = useProcedures(visitId);
  const invoices = useInvoices({ visitId, take: 50 });
  const products = useProducts({ take: 200 });
  const services = useServices({ take: 200 });

  return useMemo(() => {
    const productName = new Map((products.data ?? []).map((p) => [p.id, p.nameAr]));
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
      .map((p) => ({ id: p.id, name: productName.get(p.productId) ?? "—", quantity: p.quantity ?? 1 }));

    const procedures = (procs.data ?? [])
      .filter((p) => p.serviceId != null && !billedProc.has(p.id))
      .map((p) => ({ id: p.id, name: (p.serviceId && serviceName.get(p.serviceId)) || "—", price: p.price }));

    return {
      prescriptions,
      procedures,
      isLoading: rx.isLoading || procs.isLoading || invoices.isLoading,
    };
  }, [rx.data, rx.isLoading, procs.data, procs.isLoading, invoices.data, invoices.isLoading, products.data, services.data]);
}

/**
 * Collapsed by default — a one-line header with the charge count keeps the cart's vertical
 * space for line items; expanding reveals the same dispensed/procedure breakdown as before.
 */
function VisitChargesPreview({ visitId }: { visitId: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { prescriptions, procedures, isLoading } = useVisitCharges(visitId);
  const count = prescriptions.length + procedures.length;
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border bg-ink-50/60">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl p-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
      >
        <Icon.fwd
          className={cn(
            "size-3.5 flex-none text-muted-foreground transition-transform",
            open ? "rotate-90" : "rtl:-scale-x-100",
          )}
          aria-hidden
        />
        <span className="flex-1 text-start font-semibold text-navy-900">
          {t("pos.link.visitCharges")}
        </span>
        <span className="flex-none tabular-nums text-muted-foreground">
          {isLoading ? "…" : count}
        </span>
      </button>
      {open ? (
        <div className="px-2.5 pb-2.5 ps-8">
          {/* No charges → the empty message alone; the auto-add hint would only confuse. */}
          {count === 0 && !isLoading ? (
            <p className="text-xs text-muted-foreground">{t("pos.link.noVisitCharges")}</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {prescriptions.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1">
                    <Badge variant="secondary">{t("pos.link.dispensed")}</Badge>
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="text-muted-foreground tabular-nums">× {formatQuantity(p.quantity, lang)}</span>
                </li>
              ))}
              {procedures.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1">
                    <Badge variant="secondary">{t("pos.link.procedure")}</Badge>
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground"><Money value={p.price} /></span>
                </li>
              ))}
            </ul>
          )}
          {count > 0 ? (
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              {t("pos.link.visitChargesHint")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
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
  const setCustomer = usePosCartStore((s) => s.setCustomer);
  const linkVisit = usePosCartStore((s) => s.linkVisit);
  const clearVisit = usePosCartStore((s) => s.clearVisit);

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
      </div>

      {visitId ? <VisitChargesPreview visitId={visitId} /> : null}

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
