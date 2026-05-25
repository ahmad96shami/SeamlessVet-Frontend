import { formatCurrency, formatQuantity } from "@vet/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { useStock } from "@/queries/inventory";
import { useServices } from "@/queries/services";
import { usePosCartStore } from "@/stores/posCartStore";

import { BarcodeScannerDialog } from "./BarcodeScannerDialog";
import { ReceiptVoucherDialog } from "./ReceiptVoucherDialog";

type Filter = "all" | "products" | "services";
const FILTERS: Filter[] = ["all", "products", "services"];

/** The POS left/end pane: search (name + barcode) + scanner, a kind filter, and a click-to-add grid
 *  of sellable products (from warehouse stock) and services. */
export function CatalogPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const addItem = usePosCartStore((s) => s.addItem);

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [filter, setFilter] = useState<Filter>("all");
  const [scanOpen, setScanOpen] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);

  // Products come from warehouse stock (on-hand + low-stock flag + selling price); the search
  // matches name + barcode server-side. Services have no inventory.
  const stock = useStock({ locationType: "warehouse", search: debounced || undefined, take: 50 });
  const services = useServices({ search: debounced || undefined, take: 50 });

  const products = filter === "services" ? [] : (stock.data ?? []);
  const svcs = filter === "products" ? [] : (services.data ?? []);
  const loading = stock.isLoading || services.isLoading;
  const empty = !loading && products.length === 0 && svcs.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-none items-center gap-2 border-b p-4">
        <div className="relative flex-1">
          <Icon.search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("pos.search.placeholder")}
            className="ps-9"
          />
        </div>
        <Button type="button" variant="secondary" onClick={() => setScanOpen(true)}>
          <Icon.box className="size-4" />
          {t("pos.search.scan")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setVoucherOpen(true)}>
          <Icon.paper className="size-4" />
          {t("pos.voucher.new")}
        </Button>
      </div>

      <div className="flex flex-none gap-2 px-4 pt-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              filter === f ? "bg-teal-500 text-white" : "bg-ink-50 text-navy-900 hover:bg-ink-100",
            )}
          >
            {t(`pos.search.${f}`)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {empty ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("pos.search.noResults")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {products.map((p) => {
              const out = p.quantity <= 0;
              return (
                <button
                  key={`p-${p.productId}`}
                  type="button"
                  disabled={out}
                  onClick={() =>
                    addItem({
                      kind: "product",
                      refId: p.productId,
                      name: p.nameAr,
                      code: p.barcode ?? undefined,
                      unit: p.unitOfMeasure ?? undefined,
                      unitPrice: p.sellingPrice,
                      available: p.quantity,
                    })
                  }
                  className="flex flex-col rounded-xl border bg-card p-3 text-start transition-colors hover:border-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="grid size-9 place-items-center rounded-lg bg-teal-50 text-teal-600">
                      <Icon.pill className="size-4" />
                    </span>
                    {out ? (
                      <Badge variant="destructive">{t("pos.catalog.outOfStock")}</Badge>
                    ) : p.belowReorderPoint ? (
                      <Badge variant="warning">{t("pos.catalog.lowStock")}</Badge>
                    ) : null}
                  </div>
                  <span className="text-sm font-semibold leading-tight text-navy-900">{p.nameAr}</span>
                  {p.barcode ? (
                    <span className="mt-0.5 text-xs text-muted-foreground" dir="ltr">
                      {p.barcode}
                    </span>
                  ) : null}
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-bold text-navy-900">{formatCurrency(p.sellingPrice, lang)}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("pos.catalog.available")}: {formatQuantity(p.quantity, lang)}
                    </span>
                  </div>
                </button>
              );
            })}
            {svcs.map((s) => (
              <button
                key={`s-${s.id}`}
                type="button"
                onClick={() =>
                  addItem({
                    kind: "service",
                    refId: s.id,
                    name: s.nameAr,
                    unit: t("pos.catalog.service"),
                    unitPrice: s.defaultPrice,
                  })
                }
                className="flex flex-col rounded-xl border bg-card p-3 text-start transition-colors hover:border-teal-400"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="grid size-9 place-items-center rounded-lg bg-ink-100 text-navy-900">
                    <Icon.stethoscope className="size-4" />
                  </span>
                  <Badge variant="secondary">{t("pos.catalog.service")}</Badge>
                </div>
                <span className="text-sm font-semibold leading-tight text-navy-900">{s.nameAr}</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-bold text-navy-900">{formatCurrency(s.defaultPrice, lang)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BarcodeScannerDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={(text) => {
          setSearch(text);
          setScanOpen(false);
        }}
      />
      <ReceiptVoucherDialog open={voucherOpen} onClose={() => setVoucherOpen(false)} />
    </div>
  );
}
