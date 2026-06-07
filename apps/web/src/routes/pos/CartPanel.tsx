import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/ui/money";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSystemSettings } from "@/queries/systemSettings";
import { usePosCartStore, type CartLine } from "@/stores/posCartStore";

import { CartCustomerVisit } from "./CartCustomerVisit";
import { CartIssue } from "./CartIssue";
import { CartPayments } from "./CartPayments";
import { computeTotals, lineTotal, paymentSummary } from "./cartTotals";

/**
 * One cart line — a single header row that is also the expander toggle (click anywhere that isn't
 * the trash): chevron · "qty ×" · name on the start edge; the line total (with the pre-discount
 * price struck through above it when a line discount applies) and the trash on the end edge.
 * Expanding reveals a flat 3-column editor — quantity / unit price / line discount.
 */
function CartLineRow({ line }: { line: CartLine }) {
  const { t } = useTranslation();
  const { setQty, setUnitPrice, setLineDiscount, removeLine } = usePosCartStore.getState();
  const overSell = line.available != null && line.quantity > line.available;
  const [open, setOpen] = useState(false);
  // Transient draft so the qty field can go empty mid-edit without the store dropping the line
  // (it only commits a value ≥ 1).
  const [qtyDraft, setQtyDraft] = useState<string | null>(null);
  const toggle = () => setOpen((v) => !v);

  const commitQty = (raw: string) => {
    setQtyDraft(raw);
    const n = Math.floor(Number(raw));
    if (raw !== "" && Number.isFinite(n) && n >= 1) setQty(line.key, n);
  };

  return (
    <div className="border-b px-3 py-2">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={t("pos.cart.edit")}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className="flex cursor-pointer items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
      >
        <Icon.fwd
          className={cn(
            "size-3.5 flex-none text-muted-foreground transition-transform",
            open ? "rotate-90" : "rtl:-scale-x-100",
          )}
          aria-hidden
        />
        <span className="flex-none text-sm font-bold tabular-nums text-navy-900">
          {line.quantity} ×
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy-900">
          {line.name}
        </span>
        <span className="flex flex-none flex-col items-end justify-center">
          {/* Old (pre-discount) price, struck through, only when a line discount applies. */}
          {line.discountAmount > 0 ? (
            <span
              dir="ltr"
              className="text-[11px] leading-tight tabular-nums text-muted-foreground line-through"
            >
              {(line.quantity * line.unitPrice).toFixed(2)}
            </span>
          ) : null}
          <span className="text-sm font-bold leading-tight tabular-nums text-navy-900">
            <Money value={lineTotal(line)} />
          </span>
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeLine(line.key);
          }}
          aria-label={t("pos.cart.remove")}
          className="-my-1 flex-none rounded-md p-1 text-muted-foreground transition-colors hover:bg-red-soft/40 hover:text-destructive"
        >
          <Icon.trash className="size-4" />
        </button>
      </div>

      {open ? (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">
              {t("pos.cart.qty")}
            </span>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              step="1"
              dir="ltr"
              value={qtyDraft ?? String(line.quantity)}
              onChange={(e) => commitQty(e.target.value)}
              onBlur={() => setQtyDraft(null)}
              className="h-8 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">
              {t("pos.receipt.price")}
            </span>
            <Input
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              value={line.unitPrice}
              onChange={(e) => setUnitPrice(line.key, Number(e.target.value) || 0)}
              className="h-8 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">
              {t("pos.cart.lineDiscount")}
            </span>
            <Input
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              placeholder="0"
              value={line.discountAmount || ""}
              onChange={(e) => setLineDiscount(line.key, Number(e.target.value) || 0)}
              className="h-8 text-sm"
            />
          </label>
        </div>
      ) : null}

      {overSell ? (
        <p className="mt-1 ps-[22px] text-xs text-destructive">
          {t("pos.catalog.available")}: {line.available}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Invoice-level discount row — the parent only mounts it while a discount is being entered or is
 * set (no "الخصم 0.00" filler row); the trash clears the value and tells the parent to hide it.
 */
function InvoiceDiscount({ onHide }: { onHide: () => void }) {
  const { t } = useTranslation();
  const invoiceDiscount = usePosCartStore((s) => s.invoiceDiscount);
  const setInvoiceDiscount = usePosCartStore((s) => s.setInvoiceDiscount);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{t("pos.cart.discount")}</span>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={0}
          step="0.01"
          dir="ltr"
          placeholder="0"
          autoFocus
          value={invoiceDiscount || ""}
          onChange={(e) => setInvoiceDiscount(Number(e.target.value) || 0)}
          className="h-8 w-24 text-end"
        />
        <button
          type="button"
          onClick={() => {
            setInvoiceDiscount(0);
            onHide();
          }}
          aria-label={t("pos.cart.remove")}
          className="shrink-0 rounded-md p-1 text-destructive hover:bg-red-soft/40"
        >
          <Icon.trash className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** The POS right/start pane: working invoice — compact line items + the live (server-previewed) totals. */
export function CartPanel() {
  const { t } = useTranslation();
  const lines = usePosCartStore((s) => s.lines);
  const visitId = usePosCartStore((s) => s.visitId);
  const invoiceDiscount = usePosCartStore((s) => s.invoiceDiscount);
  const payments = usePosCartStore((s) => s.payments);
  const setPayments = usePosCartStore((s) => s.setPayments);
  const [addingDiscount, setAddingDiscount] = useState(false);

  const settings = useSystemSettings();
  const tax = {
    enabled: settings.data?.taxEnabled ?? false,
    rate: settings.data?.taxRate ?? 0,
  };
  const totals = computeTotals(lines, invoiceDiscount, tax);

  const hasSomethingToBill = lines.length > 0 || visitId !== null;
  // The discount row only exists while one is being entered or set — no placeholder row.
  const discountShown = lines.length > 0 && (addingDiscount || invoiceDiscount > 0);

  const addPaymentLeg = () => {
    const { remaining } = paymentSummary(payments, totals.total);
    setPayments([...payments, { key: crypto.randomUUID(), method: "cash", amount: remaining }]);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CartCustomerVisit />

      <div className="min-h-0 flex-1 overflow-auto">
        {lines.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-muted-foreground">{t("pos.cart.empty")}</p>
        ) : (
          lines.map((line) => <CartLineRow key={line.key} line={line} />)
        )}
      </div>

      <div className="flex-none border-t bg-ink-50/50 p-4">
        {/* Add payment / add discount — one action row above the totals (replaces the old
            payments header and the always-on discount row). */}
        {hasSomethingToBill ? (
          <div className="mb-3 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={addPaymentLeg}
            >
              <Icon.add className="size-4" />
              {t("pos.payment.add")}
            </Button>
            {lines.length > 0 && !discountShown ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setAddingDiscount(true)}
              >
                <Icon.add className="size-4" />
                {t("pos.cart.addDiscount")}
              </Button>
            ) : null}
          </div>
        ) : null}

        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("pos.cart.subtotal")}</dt>
            <dd className="font-medium tabular-nums"><Money value={totals.subtotal} /></dd>
          </div>
          {discountShown ? <InvoiceDiscount onHide={() => setAddingDiscount(false)} /> : null}
          {tax.enabled ? (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t("pos.cart.tax")}</dt>
              <dd className="tabular-nums"><Money value={totals.taxAmount} /></dd>
            </div>
          ) : null}
          {/* No grand-total row — the amount due lives on the collect button (CartIssue). */}
        </dl>

        <CartPayments total={totals.total} />
        <CartIssue total={totals.total} />
      </div>
    </div>
  );
}
