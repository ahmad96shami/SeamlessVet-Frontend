import type { PaymentMethod } from "@vet/shared";
import { create } from "zustand";

export type CartLineKind = "product" | "service";

export interface CartLine {
  /** Stable key = the catalog id; one line per product/service (re-adding increments qty). */
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
}

export interface PaymentLeg {
  key: string;
  method: PaymentMethod;
  amount: number;
}

interface PosCartState {
  lines: CartLine[];
  /** Linked customer (null = walk-in / no ledger). `customerLabel` is just for display. */
  customerId: string | null;
  customerLabel: string | null;
  /** Linked visit — its unbilled dispensed meds + procedures auto-assemble server-side at issuance. */
  visitId: string | null;
  invoiceDiscount: number;
  payments: PaymentLeg[];

  addItem: (item: Omit<CartLine, "key" | "quantity" | "discountAmount">) => void;
  setQty: (key: string, quantity: number) => void;
  setUnitPrice: (key: string, unitPrice: number) => void;
  setLineDiscount: (key: string, discountAmount: number) => void;
  removeLine: (key: string) => void;
  setInvoiceDiscount: (amount: number) => void;
  setCustomer: (id: string | null, label: string | null) => void;
  setVisit: (id: string | null) => void;
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
  customerLabel: null,
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
      lines: s.lines.flatMap((l) =>
        l.key === key ? (quantity <= 0 ? [] : [{ ...l, quantity }]) : [l],
      ),
    })),
  setUnitPrice: (key, unitPrice) =>
    set((s) => ({ lines: s.lines.map((l) => (l.key === key ? { ...l, unitPrice } : l)) })),
  setLineDiscount: (key, discountAmount) =>
    set((s) => ({
      lines: s.lines.map((l) => (l.key === key ? { ...l, discountAmount } : l)),
    })),
  removeLine: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
  setInvoiceDiscount: (invoiceDiscount) => set({ invoiceDiscount }),
  setCustomer: (customerId, customerLabel) => set({ customerId, customerLabel }),
  setVisit: (visitId) => set({ visitId }),
  setPayments: (payments) => set({ payments }),
  clear: () =>
    set({
      lines: [],
      customerId: null,
      customerLabel: null,
      visitId: null,
      invoiceDiscount: 0,
      payments: [],
    }),
}));
