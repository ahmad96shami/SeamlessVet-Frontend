import { formatQuantity, SYSTEM_SERVICE_CATEGORIES, VACCINE_CATEGORY } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/ui/money";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { useStock } from "@/queries/inventory";
import { useServices } from "@/queries/services";
import { usePosCartStore } from "@/stores/posCartStore";

import { ReceiptVoucherDialog } from "./ReceiptVoucherDialog";

type Filter = "all" | "products" | "services" | "vaccines";
const FILTERS: Filter[] = ["all", "products", "services", "vaccines"];

type LayoutMode = "list" | "grid2" | "grid3" | "grid4";
const LAYOUT_KEY = "pos.catalogLayout";
const LAYOUT_GRID_CLASS: Record<LayoutMode, string> = {
  list: "grid-cols-1",
  grid2: "grid-cols-2",
  grid3: "grid-cols-2 lg:grid-cols-3",
  grid4: "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

/** The POS left/end pane: search (name + barcode) + scanner, a kind filter, and a click-to-add grid
 *  of sellable products (from warehouse stock) and services. */
export function CatalogPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const addItem = usePosCartStore((s) => s.addItem);

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [filter, setFilter] = useState<Filter>("all");
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [layout, setLayout] = useState<LayoutMode>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(LAYOUT_KEY) : null;
    return stored === "list" || stored === "grid2" || stored === "grid3" || stored === "grid4" ? stored : "list";
  });
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(LAYOUT_KEY, layout);
  }, [layout]);

  // Products come from warehouse stock (on-hand + low-stock flag + selling price); the search
  // matches name + barcode server-side. Services have no inventory. Vaccines (M22) are the
  // services with category `vaccination` — one fetch, split client-side, own filter tab. The M23
  // system services (checkup fee / night stay) are billing plumbing, never sold from the catalog.
  const stock = useStock({ locationType: "warehouse", search: debounced || undefined, take: 50 });
  const services = useServices({ search: debounced || undefined, take: 50 });

  const allSvcs = (services.data ?? []).filter(
    (s) => s.category == null || !SYSTEM_SERVICE_CATEGORIES.includes(s.category),
  );
  const products = filter === "services" || filter === "vaccines" ? [] : (stock.data ?? []);
  const svcs =
    filter === "products" || filter === "vaccines"
      ? []
      : allSvcs.filter((s) => s.category !== VACCINE_CATEGORY);
  const vaccines =
    filter === "products" || filter === "services"
      ? []
      : allSvcs.filter((s) => s.category === VACCINE_CATEGORY);
  const loading = stock.isLoading || services.isLoading;
  const empty = !loading && products.length === 0 && svcs.length === 0 && vaccines.length === 0;

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
        <Button type="button" variant="secondary" onClick={() => setVoucherOpen(true)}>
          <Icon.paper className="size-4" />
          {t("pos.voucher.new")}
        </Button>
      </div>

      <div className="flex flex-none items-center justify-between gap-2 px-4 pt-3">
        <div className="flex flex-wrap gap-2">
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
        <div className="flex flex-none items-center rounded-lg border p-0.5">
          {(["list", "grid2", "grid3", "grid4"] as const).map((mode) => {
            const active = layout === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setLayout(mode)}
                aria-pressed={active}
                aria-label={t(`pos.layout.${mode}`)}
                title={t(`pos.layout.${mode}`)}
                className={cn(
                  "flex h-7 items-center gap-1 rounded px-2 text-xs font-bold transition-colors",
                  active ? "bg-navy-900 text-white" : "text-muted-foreground hover:bg-ink-50",
                )}
              >
                {mode === "list" ? <Icon.list className="size-4" /> : <Icon.grid className="size-4" />}
                {/* Tajawal's lining digits float ~2px above the flex centre (no descender ink,
                    big reserved diacritic descent) — push the digit down to the icon's centre. */}
                {mode !== "list" ? <span className="translate-y-[2px] tabular-nums">{mode.slice(-1)}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {empty ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("pos.search.noResults")}
          </p>
        ) : (
          <div className={cn("grid gap-3", LAYOUT_GRID_CLASS[layout])}>
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
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 text-start transition-colors hover:border-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="grid size-12 flex-none place-items-center rounded-lg bg-teal-50 text-teal-600">
                    <Icon.box className="size-5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold leading-tight text-navy-900">{p.nameAr}</span>
                    <span className="mt-1 text-sm font-bold text-navy-900"><Money value={p.sellingPrice} /></span>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-1">
                    {out ? (
                      <Badge variant="destructive">{t("pos.catalog.outOfStock")}</Badge>
                    ) : p.belowReorderPoint ? (
                      <Badge variant="warning">{t("pos.catalog.lowStock")}</Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
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
                className="flex items-center gap-3 rounded-xl border bg-card p-3 text-start transition-colors hover:border-teal-400"
              >
                <span className="grid size-12 flex-none place-items-center rounded-lg bg-ink-100 text-navy-900">
                  <Icon.stethoscope className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold leading-tight text-navy-900">{s.nameAr}</span>
                  <span className="mt-1 text-sm font-bold text-navy-900"><Money value={s.defaultPrice} /></span>
                </div>
                <Badge variant="secondary" className="flex-none">{t("pos.catalog.service")}</Badge>
              </button>
            ))}
            {vaccines.map((s) => (
              <button
                key={`v-${s.id}`}
                type="button"
                onClick={() =>
                  addItem({
                    kind: "service",
                    refId: s.id,
                    name: s.nameAr,
                    unit: t("pos.catalog.vaccine"),
                    unitPrice: s.defaultPrice,
                  })
                }
                className="flex items-center gap-3 rounded-xl border bg-card p-3 text-start transition-colors hover:border-teal-400"
              >
                <span className="grid size-12 flex-none place-items-center rounded-lg bg-teal-50 text-teal-600">
                  <Icon.syringe className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold leading-tight text-navy-900">{s.nameAr}</span>
                  <span className="mt-1 text-sm font-bold text-navy-900"><Money value={s.defaultPrice} /></span>
                </div>
                <Badge variant="secondary" className="flex-none">{t("pos.catalog.vaccine")}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      <ReceiptVoucherDialog open={voucherOpen} onClose={() => setVoucherOpen(false)} />
    </div>
  );
}
