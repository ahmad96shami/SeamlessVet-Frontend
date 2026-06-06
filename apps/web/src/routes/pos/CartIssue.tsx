import type { PosInvoiceInput } from "@vet/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import { useIssuePosInvoice } from "@/queries/invoices";
import { usePosCartStore } from "@/stores/posCartStore";

import { paymentSummary } from "./cartTotals";
import { IssuedSaleDialog } from "./IssuedSaleDialog";

/**
 * Issues the cart as a POS invoice (W6.5). Builds the request from the store, sends it (the wrapper
 * mints the id + idempotency key), and on success opens the receipt dialog and clears the cart.
 *
 * `canIssue` mirrors the server's guards client-side: something to bill and payments not over the
 * total. The walk-in (no ledger) paid-in-full rule is checked on press instead — the button stays
 * enabled and the warning only appears once the cashier actually tries to collect. When a visit is
 * linked the client total understates (the server adds the visit's charges), so payment validation
 * is deferred to the server.
 */
export function CartIssue({ total }: { total: number }) {
  const { t } = useTranslation();
  const lines = usePosCartStore((s) => s.lines);
  const payments = usePosCartStore((s) => s.payments);
  const customerId = usePosCartStore((s) => s.customerId);
  const visitId = usePosCartStore((s) => s.visitId);

  const issue = useIssuePosInvoice();
  const [issuedId, setIssuedId] = useState<string | null>(null);
  const [walkInWarning, setWalkInWarning] = useState(false);

  const { overpaid, remaining } = paymentSummary(payments, total);
  const hasSomethingToBill = lines.length > 0 || visitId !== null;
  // A linked visit implies a customer, so this can only hold for a plain walk-in cart.
  const walkInUnpaid = customerId === null && remaining > 0;
  const canIssue = hasSomethingToBill && !issue.isPending && (visitId !== null || !overpaid);

  const onIssue = () => {
    if (walkInUnpaid) {
      setWalkInWarning(true);
      return;
    }
    const s = usePosCartStore.getState();
    const input: PosInvoiceInput = {
      customerId: s.customerId ?? undefined,
      visitId: s.visitId ?? undefined,
      discountAmount: s.invoiceDiscount,
      items: s.lines.map((l) => ({
        productId: l.kind === "product" ? l.refId : undefined,
        serviceId: l.kind === "service" ? l.refId : undefined,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountAmount: l.discountAmount,
      })),
      payments: s.payments.map((p) => ({
        method: p.method,
        amount: p.amount,
        // M19 — carry cheque reference metadata only on a cheque leg (omit blanks).
        ...(p.method === "cheque"
          ? {
              ...(p.chequeNumber?.trim() ? { chequeNumber: p.chequeNumber.trim() } : {}),
              ...(p.chequeBank?.trim() ? { chequeBank: p.chequeBank.trim() } : {}),
              ...(p.chequeDueDate ? { chequeDueDate: p.chequeDueDate } : {}),
            }
          : {}),
      })),
    };
    issue.mutate(input, {
      onSuccess: (res) => {
        s.clear();
        setWalkInWarning(false);
        if (res.queued) {
          // Offline: the sale is queued and will post (stock + ledger) on reconnect. No receipt yet —
          // it prints from the invoices history once it syncs.
          toast.success(t("pos.issue.queued"));
        } else {
          setIssuedId(res.id);
        }
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <>
      <div className="mt-3 space-y-2">
        {walkInWarning && walkInUnpaid ? (
          <p className="text-xs text-destructive">{t("pos.payment.walkInMustPay")}</p>
        ) : null}
        {/* Always visible — grayed out (disabled) on an empty cart. The amount due replaces the
            old grand-total row; the symbol's fixed ink tint is overridden to read on navy. */}
        <Button type="button" size="lg" className="w-full" disabled={!canIssue} onClick={onIssue}>
          <Icon.receipt className="size-4" />
          {issue.isPending ? t("pos.issue.submitting") : t("pos.issue.submit")}
          {hasSomethingToBill ? (
            <Money value={total} className="[&_.money-symbol]:text-current" />
          ) : null}
        </Button>
      </div>
      {issuedId ? (
        <IssuedSaleDialog invoiceId={issuedId} onClose={() => setIssuedId(null)} />
      ) : null}
    </>
  );
}
