import type { PosInvoiceInput } from "@vet/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useIssuePosInvoice } from "@/queries/invoices";
import { usePosCartStore } from "@/stores/posCartStore";

import { paymentSummary } from "./cartTotals";
import { IssuedSaleDialog } from "./IssuedSaleDialog";

/**
 * Issues the cart as a POS invoice (W6.5). Builds the request from the store, sends it (the wrapper
 * mints the id + idempotency key), and on success opens the receipt dialog and clears the cart.
 *
 * `canIssue` mirrors the server's guards client-side: something to bill, payments not over the total,
 * and a walk-in (no ledger) paid in full. When a visit is linked the client total understates (the
 * server adds the visit's charges), so payment validation is deferred to the server.
 */
export function CartIssue({ total }: { total: number }) {
  const { t } = useTranslation();
  const lines = usePosCartStore((s) => s.lines);
  const payments = usePosCartStore((s) => s.payments);
  const customerId = usePosCartStore((s) => s.customerId);
  const visitId = usePosCartStore((s) => s.visitId);

  const issue = useIssuePosInvoice();
  const [issuedId, setIssuedId] = useState<string | null>(null);

  const { overpaid, remaining } = paymentSummary(payments, total);
  const hasSomethingToBill = lines.length > 0 || visitId !== null;
  const clientPaymentOk = !overpaid && !(customerId === null && remaining > 0);
  const canIssue = hasSomethingToBill && !issue.isPending && (visitId !== null || clientPaymentOk);

  const onIssue = () => {
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
      payments: s.payments.map((p) => ({ method: p.method, amount: p.amount })),
    };
    issue.mutate(input, {
      onSuccess: (res) => {
        setIssuedId(res.id);
        s.clear();
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <>
      {hasSomethingToBill ? (
        <Button type="button" size="lg" className="mt-3 w-full" disabled={!canIssue} onClick={onIssue}>
          <Icon.receipt className="size-4" />
          {issue.isPending ? t("pos.issue.submitting") : t("pos.issue.submit")}
        </Button>
      ) : null}
      {issuedId ? (
        <IssuedSaleDialog invoiceId={issuedId} onClose={() => setIssuedId(null)} />
      ) : null}
    </>
  );
}
