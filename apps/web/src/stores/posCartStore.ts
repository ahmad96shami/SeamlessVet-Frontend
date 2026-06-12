import type { PaymentMethod } from "@vet/shared";
import { create } from "zustand";

export type CartLineKind = "product" | "service";

export interface CartLine {
  /**
   * Stable key = the catalog id; one line per product/service (re-adding increments qty).
   * Locked visit lines key by their prescription/procedure id instead, so a manual line for the
   * same product coexists without merging.
   */
  key: string;
  kind: CartLineKind;
  refId: string;
  name: string;
  /** Barcode / SKU, for display. */
  code?: string;
  /** Unit of measure (products) or the "service" label. */
  unit?: string;
  /** Editable; pre-filled from the catalog selling price. */
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  /** On-hand at the warehouse (products only) — drives the over-sell hint. */
  available?: number;
  /**
   * A locked line mirrors one of the linked visit's unbilled charges: it can't be removed and its
   * quantity is fixed (edited on the visit, server-authoritative at issuance) — only price and
   * discount are the cashier's. Carries the back-link the server de-dupes assembly against.
   */
  locked?: boolean;
  prescriptionId?: string;
  procedureId?: string;
  /** M26 — a catalog-linked visit vaccination billed as a product line (vaccines are products). */
  vaccinationId?: string;
  /** M23 — a closed night stay billed as a system-service line (qty = nights, price = rate). */
  nightStayId?: string;
  /** M23 — the visit's checkup fee billed as a system-service line (these two lines send NO
   *  productId/serviceId at issue — the server resolves the system service itself). */
  checkupFeeVisitId?: string;
}

export interface PaymentLeg {
  key: string;
  method: PaymentMethod;
  amount: number;
  // M19 — cheque reference metadata, set only when `method` is `cheque`.
  chequeNumber?: string;
  chequeBank?: string;
  chequeDueDate?: string;
}

interface PosCartState {
  lines: CartLine[];
  /** Linked customer (null = walk-in / no ledger); the name is resolved from the id for display. */
  customerId: string | null;
  /** Linked visit — its unbilled dispensed meds + procedures + vaccinations auto-assemble server-side at issuance. */
  visitId: string | null;
  invoiceDiscount: number;
  payments: PaymentLeg[];

  addItem: (item: Omit<CartLine, "key" | "quantity" | "discountAmount">) => void;
  setQty: (key: string, quantity: number) => void;
  setUnitPrice: (key: string, unitPrice: number) => void;
  setLineDiscount: (key: string, discountAmount: number) => void;
  removeLine: (key: string) => void;
  /**
   * Reconcile the locked visit lines with the visit's current unbilled charges: lines for new
   * charges appear, lines for charges that vanished (billed elsewhere / removed on the visit) go,
   * and a line that survives keeps the cashier's price/discount edits. Manual lines are untouched.
   */
  syncVisitLines: (visitLines: Omit<CartLine, "locked">[]) => void;
  setInvoiceDiscount: (amount: number) => void;
  /** Set/clear the customer. Changing the customer drops any linked visit (it belonged to the old one). */
  setCustomer: (id: string | null) => void;
  /** Link a visit + its owning customer together (visit picker / deep-link). */
  linkVisit: (visitId: string, customerId: string) => void;
  clearVisit: () => void;
  setPayments: (payments: PaymentLeg[]) => void;
  clear: () => void;
}

/**
 * The POS cart — a single client-side draft sale. Lives in a store (not page state) so it survives
 * tab/route changes within the cashier surface. Issuance (W6.5) sends it through POST /pos/invoices;
 * the server recomputes the money and is authoritative.
 */
export const usePosCartStore = create<PosCartState>((set) => ({
  lines: [],
  customerId: null,
  visitId: null,
  invoiceDiscount: 0,
  payments: [],

  addItem: (item) =>
    set((s) => {
      if (s.lines.some((l) => l.key === item.refId)) {
        return {
          lines: s.lines.map((l) =>
            l.key === item.refId ? { ...l, quantity: l.quantity + 1 } : l,
          ),
        };
      }
      return { lines: [...s.lines, { ...item, key: item.refId, quantity: 1, discountAmount: 0 }] };
    }),
  setQty: (key, quantity) =>
    set((s) => ({
      // A locked line's quantity is the visit's to change — ignore edits (and never drop it).
      lines: s.lines.flatMap((l) =>
        l.key === key && !l.locked ? (quantity <= 0 ? [] : [{ ...l, quantity }]) : [l],
      ),
    })),
  setUnitPrice: (key, unitPrice) =>
    set((s) => ({ lines: s.lines.map((l) => (l.key === key ? { ...l, unitPrice } : l)) })),
  setLineDiscount: (key, discountAmount) =>
    set((s) => ({
      lines: s.lines.map((l) => (l.key === key ? { ...l, discountAmount } : l)),
    })),
  removeLine: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key || l.locked) })),
  syncVisitLines: (visitLines) =>
    set((s) => {
      const prev = new Map(s.lines.filter((l) => l.locked).map((l) => [l.key, l]));
      const merged = visitLines.map((vl) => {
        const kept = prev.get(vl.key);
        // The source (name/qty) follows the visit; price/discount keep the cashier's edits.
        return kept
          ? { ...vl, locked: true, unitPrice: kept.unitPrice, discountAmount: kept.discountAmount }
          : { ...vl, locked: true };
      });
      return { lines: [...merged, ...s.lines.filter((l) => !l.locked)] };
    }),
  setInvoiceDiscount: (invoiceDiscount) => set({ invoiceDiscount }),
  // Dropping/charging the customer or visit also drops the visit's locked lines.
  setCustomer: (customerId) =>
    set((s) => ({ customerId, visitId: null, lines: s.lines.filter((l) => !l.locked) })),
  linkVisit: (visitId, customerId) => set({ visitId, customerId }),
  clearVisit: () => set((s) => ({ visitId: null, lines: s.lines.filter((l) => !l.locked) })),
  setPayments: (payments) => set({ payments }),
  clear: () =>
    set({ lines: [], customerId: null, visitId: null, invoiceDiscount: 0, payments: [] }),
}));
