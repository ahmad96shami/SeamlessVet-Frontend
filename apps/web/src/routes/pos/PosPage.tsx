import { Card } from "@/components/ui/card";

import { CartPanel } from "./CartPanel";
import { CatalogPanel } from "./CatalogPanel";

/**
 * Center Web App POS register (W6) — a full-height two-pane cashier surface: the working invoice
 * (cart) on the inline-start side and the searchable catalog on the end side. RTL-safe via the
 * natural flex order (the cart renders at the inline-start, matching the design).
 */
export function PosPage() {
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
