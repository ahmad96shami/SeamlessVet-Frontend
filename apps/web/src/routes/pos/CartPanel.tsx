import { formatCurrency } from "@vet/shared";
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
import { computeTotals, lineTotal } from "./cartTotals";

/**
 * Quantity stepper: − / editable number / +, in one bordered control whose radius matches the text
 * inputs (`--radius-input`). The number is directly editable; a transient draft string lets the
 * field go empty mid-edit without the store dropping the line (it only commits a value ≥ 1).
 */
function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);

  const commit = (raw: string) => {
    setDraft(raw);
    const n = Math.floor(Number(raw));
    if (raw !== "" && Number.isFinite(n) && n >= 1) onChange(n);
  };

  const btn =
    "grid w-9 place-items-center text-muted-foreground transition-colors hover:bg-ink-50 hover:text-navy-900 active:bg-ink-100";

  return (
    // Stop clicks from bubbling to the expander header (which toggles on click).
    <div
      onClick={(e) => e.stopPropagation()}
      className="inline-flex h-9 select-none items-stretch overflow-hidden rounded-[var(--radius-input)] border border-[var(--border-strong)] bg-[var(--paper)]"
    >
      <button type="button" aria-label="-" onClick={() => onChange(value - 1)} className={btn}>
        <span className="block h-0.5 w-3 rounded-full bg-current" aria-hidden />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        dir="ltr"
        aria-label={t("pos.cart.qty")}
        value={shown}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => setDraft(null)}
        className="w-11 border-x border-[var(--border-strong)] bg-transparent text-center text-sm font-bold tabular-nums text-navy-900 outline-none focus:bg-ink-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" aria-label="+" onClick={() => onChange(value + 1)} className={btn}>
        <Icon.add className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

/**
 * One cart line. The whole header is the expander toggle (click anywhere that isn't the qty stepper
 * or trash); it reveals an inline editor for unit price and line discount. Header is two tidy rows:
 * top = name · line total; bottom = unit · qty stepper. Chevron leads, trash trails.
 */
function CartLineRow({ line }: { line: CartLine }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { setQty, setUnitPrice, setLineDiscount, removeLine } = usePosCartStore.getState();
  const overSell = line.available != null && line.quantity > line.available;
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);

  return (
    <div className="border-b px-3 py-2.5">
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
        className="flex cursor-pointer items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
      >
        <Icon.fwd
          className={cn(
            "size-4 flex-none text-muted-foreground transition-transform",
            open ? "rotate-90" : "rtl:-scale-x-100",
          )}
          aria-hidden
        />

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-navy-900">{line.name}</span>
            <span className="flex-none text-sm font-bold tabular-nums text-navy-900">
              {formatCurrency(lineTotal(line), lang)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
              {line.unit ?? ""}
            </span>
            <QtyStepper value={line.quantity} onChange={(n) => setQty(line.key, n)} />
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeLine(line.key);
          }}
          aria-label={t("pos.cart.remove")}
          className="flex-none self-center rounded-md p-1 text-destructive hover:bg-red-soft/40"
        >
          <Icon.trash className="size-4" />
        </button>
      </div>

      {open ? (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-ink-50/60 p-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground">
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
            <span className="text-[10px] font-semibold text-muted-foreground">
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
        <p className="mt-1 text-xs text-destructive">
          {t("pos.catalog.available")}: {line.available}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Invoice-level discount — mirrors the payments block: a header with an "add" button that reveals
 * the input row (with a trash to clear it again). The input stays revealed while a discount is set.
 */
function InvoiceDiscount() {
  const { t } = useTranslation();
  const invoiceDiscount = usePosCartStore((s) => s.invoiceDiscount);
  const setInvoiceDiscount = usePosCartStore((s) => s.setInvoiceDiscount);
  const [adding, setAdding] = useState(false);
  const shown = adding || invoiceDiscount > 0;

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{t("pos.cart.discount")}</span>
      {shown ? (
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
              setAdding(false);
            }}
            aria-label={t("pos.cart.remove")}
            className="shrink-0 rounded-md p-1 text-destructive hover:bg-red-soft/40"
          >
            <Icon.trash className="size-4" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-my-1 h-7 gap-1 px-2 text-primary"
          onClick={() => setAdding(true)}
        >
          <Icon.add className="size-3.5" />
          {t("pos.cart.addDiscount")}
        </Button>
      )}
    </div>
  );
}

/** The POS right/start pane: working invoice — compact line items + the live (server-previewed) totals. */
export function CartPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const lines = usePosCartStore((s) => s.lines);
  const invoiceDiscount = usePosCartStore((s) => s.invoiceDiscount);
  const clear = usePosCartStore((s) => s.clear);

  const settings = useSystemSettings();
  const tax = {
    enabled: settings.data?.taxEnabled ?? false,
    rate: settings.data?.taxRate ?? 0,
  };
  const totals = computeTotals(lines, invoiceDiscount, tax);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CartCustomerVisit />

      <div className="min-h-0 flex-1 overflow-auto">
        {lines.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-muted-foreground">{t("pos.cart.empty")}</p>
        ) : (
          <>
            {lines.map((line) => <CartLineRow key={line.key} line={line} />)}
            <div className="flex justify-end px-3 py-2">
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
            </div>
          </>
        )}
      </div>

      <div className="flex-none border-t bg-ink-50/50 p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("pos.cart.subtotal")}</dt>
            <dd className="font-medium tabular-nums"><Money value={totals.subtotal} /></dd>
          </div>
          {lines.length > 0 ? <InvoiceDiscount /> : null}
          {tax.enabled ? (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t("pos.cart.tax")}</dt>
              <dd className="tabular-nums">{formatCurrency(totals.taxAmount, lang)}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t pt-2 text-base font-bold text-navy-900">
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
