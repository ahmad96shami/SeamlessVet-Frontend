import { IMMEDIATE_PAYMENT_METHODS, type PaymentMethod } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/ui/money";

import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/datepicker";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { PaymentLeg } from "@/stores/posCartStore";
import { usePosCartStore } from "@/stores/posCartStore";

import { paymentSummary } from "./cartTotals";

/**
 * Methods that settle immediately (cash / card / bank transfer / cheque — M19). Credit isn't a leg
 * here — an under-payment IS the credit (the server posts `total − non-credit payments` to the
 * ledger), so the remainder is shown as "on account" rather than entered as a separate leg.
 */
const IMMEDIATE_METHODS = IMMEDIATE_PAYMENT_METHODS;

/**
 * Mixed-payment entry (W6.4): the legs (method + amount) added from the action row above the totals
 * (CartPanel). Shows paid / remaining only once they're non-trivial; a positive remainder lands on
 * the customer's ledger as credit. A walk-in (no ledger) must pay in full — surfaced on the issue
 * attempt (CartIssue), not here. Sum-vs-total is also enforced server-side.
 */
export function CartPayments({ total }: { total: number }) {
  const { t } = useTranslation();
  const payments = usePosCartStore((s) => s.payments);
  const setPayments = usePosCartStore((s) => s.setPayments);
  const hasCustomer = usePosCartStore((s) => s.customerId != null);
  const hasLines = usePosCartStore((s) => s.lines.length > 0);
  const hasVisit = usePosCartStore((s) => s.visitId != null);

  const { paid, remaining, overpaid } = paymentSummary(payments, total);

  // Nothing to say (e.g. a walk-in with no legs yet) → no empty bordered block.
  const hasStatus = overpaid || (remaining > 0 && hasCustomer);
  if ((!hasLines && !hasVisit) || (payments.length === 0 && !hasStatus)) return null;

  const updateLeg = (key: string, patch: Partial<Omit<PaymentLeg, "key">>) =>
    setPayments(payments.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const changeMethod = (key: string, method: PaymentMethod) =>
    // Drop any cheque reference when switching to a non-cheque method.
    updateLeg(
      key,
      method === "cheque"
        ? { method }
        : { method, chequeNumber: undefined, chequeBank: undefined, chequeDueDate: undefined },
    );
  const removeLeg = (key: string) => setPayments(payments.filter((p) => p.key !== key));

  return (
    // mt-3 keeps the divider clear of the totals block above (the discount input otherwise touches it).
    <div className="mt-3 space-y-2 border-t pt-3">
      {payments.map((p) => (
        <div key={p.key} className="space-y-2">
          <div className="flex items-center gap-2">
            <Select
              value={p.method}
              onChange={(e) => changeMethod(p.key, e.target.value as PaymentMethod)}
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
              placeholder="0"
              value={p.amount || ""}
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
          {p.method === "cheque" ? (
            <div className="grid gap-2 rounded-lg border bg-[var(--paper-soft)] p-2 sm:grid-cols-3">
              <Input
                dir="ltr"
                placeholder={t("cheque.number")}
                value={p.chequeNumber ?? ""}
                onChange={(e) => updateLeg(p.key, { chequeNumber: e.target.value })}
                className="h-9"
              />
              <Input
                placeholder={t("cheque.bank")}
                value={p.chequeBank ?? ""}
                onChange={(e) => updateLeg(p.key, { chequeBank: e.target.value })}
                className="h-9"
              />
              <DatePicker
                aria-label={t("cheque.dueDate")}
                value={p.chequeDueDate ?? ""}
                onChange={(e) => updateLeg(p.key, { chequeDueDate: e.target.value })}
              />
            </div>
          ) : null}
        </div>
      ))}

      {paid > 0 ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          {/* The fully-paid badge rides the paid row instead of taking its own line. */}
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">{t("pos.payment.paid")}</span>
            {!overpaid && remaining === 0 ? (
              <Badge variant="success">{t("pos.payment.fullyPaid")}</Badge>
            ) : null}
          </span>
          <span className="tabular-nums"><Money value={paid} /></span>
        </div>
      ) : null}

      {overpaid ? (
        <p className="text-xs text-destructive">{t("pos.payment.exceedsTotal")}</p>
      ) : remaining > 0 && hasCustomer ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("pos.payment.onCredit")}</span>
          <span className="font-semibold tabular-nums text-navy-900">
            <Money value={remaining} />
          </span>
        </div>
      ) : null}

    </div>
  );
}
