import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { usePosCartStore } from "@/stores/posCartStore";

import { CartPanel } from "./CartPanel";
import { CatalogPanel } from "./CatalogPanel";

/**
 * Center Web App POS register (W6) — a full-height two-pane cashier surface: the working invoice
 * (cart) on the inline-start side and the searchable catalog on the end side. RTL-safe via the
 * natural flex order (the cart renders at the inline-start, matching the design).
 *
 * Accepts a `?customerId=&visitId=` deep-link (e.g. "ring up at POS" from a visit) — applied once,
 * then stripped from the URL so a later cart-clear isn't undone by a reload.
 */
export function PosPage() {
  const [params, setParams] = useSearchParams();
  const linkVisit = usePosCartStore((s) => s.linkVisit);
  const setCustomer = usePosCartStore((s) => s.setCustomer);
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    const visitId = params.get("visitId");
    const customerId = params.get("customerId");
    if (visitId && customerId) linkVisit(visitId, customerId);
    else if (customerId) setCustomer(customerId);
    if (visitId || customerId) setParams({}, { replace: true });
  }, [params, linkVisit, setCustomer, setParams]);

  return (
    <div className="flex h-full gap-4">
      <Card className="flex w-[440px] flex-none flex-col overflow-hidden">
        <CartPanel />
      </Card>
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CatalogPanel />
      </Card>
    </div>
  );
}
