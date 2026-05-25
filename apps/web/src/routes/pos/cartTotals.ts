import type { CartLine } from "@/stores/posCartStore";

export interface CartTotals {
  subtotal: number;
  /** Invoice-level discount (line discounts are already inside `subtotal`). */
  discount: number;
  taxAmount: number;
  total: number;
}

/** Round to 2 dp, half-up — matches the server's away-from-zero rounding for positive money. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineTotal(line: Pick<CartLine, "quantity" | "unitPrice" | "discountAmount">): number {
  return round2(line.quantity * line.unitPrice - line.discountAmount);
}

/**
 * Mirrors the server's POS math (InvoicesService.IssueItemizedAsync): subtotal = Σ line totals;
 * taxable = subtotal − invoice discount; tax = taxable × rate/100 when enabled; total = taxable +
 * tax. A client-side PREVIEW only — the server recomputes from the catalog and is authoritative.
 */
export function computeTotals(
  lines: CartLine[],
  invoiceDiscount: number,
  tax: { enabled: boolean; rate: number },
): CartTotals {
  const subtotal = round2(lines.reduce((sum, l) => sum + lineTotal(l), 0));
  const discount = round2(invoiceDiscount);
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = tax.enabled ? round2((taxable * tax.rate) / 100) : 0;
  return { subtotal, discount, taxAmount, total: round2(taxable + taxAmount) };
}

export interface PaymentSummary {
  paid: number;
  /** total − paid, clamped at 0; the portion that lands on the customer ledger as credit. */
  remaining: number;
  /** Payments exceed the total — the server rejects this (`payment_exceeds_total`). */
  overpaid: boolean;
}

export function paymentSummary(payments: { amount: number }[], total: number): PaymentSummary {
  const paid = round2(payments.reduce((sum, p) => sum + (p.amount || 0), 0));
  return { paid, remaining: round2(Math.max(0, total - paid)), overpaid: paid > total + 0.001 };
}
