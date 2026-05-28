import { formatCurrency, type PaymentMethod } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/ui/money";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { usePosCartStore } from "@/stores/posCartStore";

import { paymentSummary } from "./cartTotals";

/**
 * Methods that settle immediately. Credit isn't a leg here — an under-payment IS the credit (the
 * server posts `total − non-credit payments` to the ledger), so the remainder is shown as "on
 * account" rather than entered as a separate leg.
 */
const IMMEDIATE_METHODS: PaymentMethod[] = ["cash", "card", "bank_transfer"];

/**
 * Mixed-payment entry (W6.4): one or more legs (method + amount). Shows paid / remaining; a positive
 * remainder lands on the customer's ledger as credit (and is blocked for a walk-in, who has no
 * ledger). Sum-vs-total is also enforced server-side; the issue button (W6.5) gates on this state.
 */
export function CartPayments({ total }: { total: number }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const payments = usePosCartStore((s) => s.payments);
  const setPayments = usePosCartStore((s) => s.setPayments);
  const hasCustomer = usePosCartStore((s) => s.customerId != null);
  const hasLines = usePosCartStore((s) => s.lines.length > 0);
  const hasVisit = usePosCartStore((s) => s.visitId != null);

  if (!hasLines && !hasVisit) return null;

  const { paid, remaining, overpaid } = paymentSummary(payments, total);

  const addLeg = () =>
    setPayments([...payments, { key: crypto.randomUUID(), method: "cash", amount: remaining }]);
  const updateLeg = (key: string, patch: Partial<{ method: PaymentMethod; amount: number }>) =>
    setPayments(payments.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const removeLeg = (key: string) => setPayments(payments.filter((p) => p.key !== key));

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-navy-900">{t("pos.payment.title")}</span>
        <Button type="button" variant="ghost" size="sm" onClick={addLeg}>
          <Icon.add className="size-4" />
          {t("pos.payment.add")}
        </Button>
      </div>

      {payments.map((p) => (
        <div key={p.key} className="flex items-center gap-2">
          <Select
            value={p.method}
            onChange={(e) => updateLeg(p.key, { method: e.target.value as PaymentMethod })}
            containerClassName="w-36"
          >
            {IMMEDIATE_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`paymentMethod.${m}`)}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            min={0}
            step="0.01"
            dir="ltr"
            value={p.amount}
            onChange={(e) => updateLeg(p.key, { amount: Number(e.target.value) || 0 })}
            className="h-9 flex-1 text-end"
          />
          <button
            type="button"
            onClick={() => removeLeg(p.key)}
            aria-label={t("pos.payment.remove")}
            className="shrink-0 rounded-md p-1 text-destructive hover:bg-red-soft/40"
          >
            <Icon.trash className="size-4" />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("pos.payment.paid")}</span>
        <span className="tabular-nums"><Money value={paid} /></span>
      </div>

      {overpaid ? (
        <p className="text-xs text-destructive">{t("pos.payment.exceedsTotal")}</p>
      ) : remaining === 0 ? (
        <Badge variant="success">{t("pos.payment.fullyPaid")}</Badge>
      ) : hasCustomer ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("pos.payment.onCredit")}</span>
          <span className="font-semibold tabular-nums text-navy-900">
            <Money value={remaining} />
          </span>
        </div>
      ) : (
        <p className="text-xs text-destructive">{t("pos.payment.walkInMustPay")}</p>
      )}

      {hasVisit ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {t("pos.link.visitChargesHint")}
        </p>
      ) : null}
    </div>
  );
}
