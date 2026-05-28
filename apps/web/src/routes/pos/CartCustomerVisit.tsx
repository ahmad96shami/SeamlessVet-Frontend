import { formatCurrency, formatQuantity } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/ui/money";

import { Badge } from "@/components/ui/badge";
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

function VisitChargesPreview({ visitId }: { visitId: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { prescriptions, procedures, isLoading } = useVisitCharges(visitId);
  const empty = !isLoading && prescriptions.length === 0 && procedures.length === 0;

  return (
    <div className="rounded-xl border bg-ink-50/60 p-3">
      <div className="mb-1.5 text-xs font-semibold text-navy-900">{t("pos.link.visitCharges")}</div>
      {empty ? (
        <p className="text-xs text-muted-foreground">{t("pos.link.noVisitCharges")}</p>
      ) : (
        <>
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
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            {t("pos.link.visitChargesHint")}
          </p>
        </>
      )}
    </div>
  );
}

/** Cart header: walk-in vs. a linked customer, and an optional linked visit (whose unbilled charges
 *  auto-assemble at issuance). Sits between the cart title and the line items. */
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
    <div className="flex-none space-y-2 border-b p-4">
      {/* Customer */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{t("pos.link.customer")}</div>
          {customerId ? (
            <div className="truncate text-sm font-semibold text-navy-900">
              {customer.data?.fullName ?? "…"}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{t("pos.link.walkInBadge")}</div>
          )}
        </div>
        {customerId ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setCustomer(null)}>
            <Icon.close className="size-4" />
            {t("pos.link.clear")}
          </Button>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={() => setPickCustomer(true)}>
            <Icon.user className="size-4" />
            {t("pos.link.selectCustomer")}
          </Button>
        )}
      </div>

      {/* Visit (only meaningful once a customer is chosen) */}
      {customerId ? (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{t("pos.link.visit")}</div>
            {visitId ? (
              <div className="truncate text-sm font-medium" dir="ltr">
                {visit.data ? visitRef(visit.data) : `#${visitId.slice(0, 8)}`}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{t("pos.link.noVisit")}</div>
            )}
          </div>
          {visitId ? (
            <Button type="button" variant="ghost" size="sm" onClick={clearVisit}>
              <Icon.close className="size-4" />
              {t("pos.link.clear")}
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setPickVisit(true)}>
              <Icon.link className="size-4" />
              {t("pos.link.linkVisit")}
            </Button>
          )}
        </div>
      ) : null}

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
