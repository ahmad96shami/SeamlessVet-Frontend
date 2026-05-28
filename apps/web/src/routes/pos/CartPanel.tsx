import { formatCurrency } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/ui/money";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useSystemSettings } from "@/queries/systemSettings";
import { usePosCartStore, type CartLine } from "@/stores/posCartStore";

import { CartCustomerVisit } from "./CartCustomerVisit";
import { CartIssue } from "./CartIssue";
import { CartPayments } from "./CartPayments";
import { computeTotals, lineTotal } from "./cartTotals";

/** A single editable cart line: name + qty stepper + unit-price + line-discount + line total. */
function CartLineRow({ line }: { line: CartLine }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { setQty, setUnitPrice, setLineDiscount, removeLine } = usePosCartStore.getState();
  const overSell = line.available != null && line.quantity > line.available;

  return (
    <div className="border-b p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-navy-900">{line.name}</div>
          <div className="text-xs text-muted-foreground" dir="ltr">
            {[line.code, line.unit].filter(Boolean).join(" · ")}
          </div>
        </div>
        <button
          type="button"
          onClick={() => removeLine(line.key)}
          aria-label={t("pos.cart.remove")}
          className="shrink-0 rounded-md p-1 text-destructive hover:bg-red-soft/40"
        >
          <Icon.trash className="size-4" />
        </button>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <div className="flex items-center rounded-lg border">
          <button
            type="button"
            aria-label="-"
            onClick={() => setQty(line.key, line.quantity - 1)}
            className="grid size-7 place-items-center text-navy-900 hover:bg-ink-50"
          >
            <span className="text-base leading-none">−</span>
          </button>
          <span className="w-8 text-center text-sm font-bold tabular-nums">{line.quantity}</span>
          <button
            type="button"
            aria-label="+"
            onClick={() => setQty(line.key, line.quantity + 1)}
            className="grid size-7 place-items-center text-navy-900 hover:bg-ink-50"
          >
            <Icon.add className="size-3.5" />
          </button>
        </div>

        <label className="flex w-20 flex-col">
          <span className="text-[10px] text-muted-foreground">{t("pos.receipt.price")}</span>
          <Input
            type="number"
            min={0}
            step="0.01"
            dir="ltr"
            value={line.unitPrice}
            onChange={(e) => setUnitPrice(line.key, Number(e.target.value) || 0)}
            className="h-8 px-2 text-sm"
          />
        </label>
        <label className="flex w-20 flex-col">
          <span className="text-[10px] text-muted-foreground">{t("pos.cart.lineDiscount")}</span>
          <Input
            type="number"
            min={0}
            step="0.01"
            dir="ltr"
            value={line.discountAmount}
            onChange={(e) => setLineDiscount(line.key, Number(e.target.value) || 0)}
            className="h-8 px-2 text-sm"
          />
        </label>
        <span className="ms-auto pb-1 font-bold tabular-nums text-navy-900">
          {formatCurrency(lineTotal(line), lang)}
        </span>
      </div>

      {overSell ? (
        <p className="mt-1 text-xs text-destructive">
          {t("pos.catalog.available")}: {line.available}
        </p>
      ) : null}
    </div>
  );
}

/** The POS right/start pane: the working invoice — line items + the live (server-previewed) totals.
 *  Customer/visit linking (W6.3), payments (W6.4) and the issue button (W6.5) layer in next. */
export function CartPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const lines = usePosCartStore((s) => s.lines);
  const invoiceDiscount = usePosCartStore((s) => s.invoiceDiscount);
  const setInvoiceDiscount = usePosCartStore((s) => s.setInvoiceDiscount);
  const clear = usePosCartStore((s) => s.clear);

  const settings = useSystemSettings();
  const tax = {
    enabled: settings.data?.taxEnabled ?? false,
    rate: settings.data?.taxRate ?? 0,
  };
  const totals = computeTotals(lines, invoiceDiscount, tax);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-none items-center justify-between gap-2 border-b p-4">
        <h2 className="text-base font-bold text-navy-900">{t("pos.cart.title")}</h2>
        {lines.length > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            {t("pos.cart.clear")}
          </Button>
        ) : null}
      </div>

      <CartCustomerVisit />

      <div className="min-h-0 flex-1 overflow-auto">
        {lines.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-muted-foreground">{t("pos.cart.empty")}</p>
        ) : (
          lines.map((line) => <CartLineRow key={line.key} line={line} />)
        )}
      </div>

      <div className="flex-none border-t bg-ink-50/50 p-4">
        <dl className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("pos.cart.subtotal")}</dt>
            <dd className="font-medium tabular-nums"><Money value={totals.subtotal} /></dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{t("pos.cart.invoiceDiscount")}</dt>
            <Input
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              value={invoiceDiscount}
              onChange={(e) => setInvoiceDiscount(Number(e.target.value) || 0)}
              className="h-8 w-24 px-2 text-end text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("pos.cart.tax")}</dt>
            <dd className="tabular-nums">
              {tax.enabled ? formatCurrency(totals.taxAmount, lang) : t("pos.cart.taxExempt")}
            </dd>
          </div>
          <div className="mt-1 flex items-center justify-between border-t pt-2 text-base font-bold text-navy-900">
            <dt>{t("pos.cart.total")}</dt>
            <dd className="tabular-nums"><Money value={totals.total} /></dd>
          </div>
        </dl>

        <CartPayments total={totals.total} />
        <CartIssue total={totals.total} />
      </div>
    </div>
  );
}
