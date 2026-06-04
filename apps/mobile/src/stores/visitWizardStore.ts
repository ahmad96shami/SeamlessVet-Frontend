import { create } from "zustand";

/**
 * In-progress state for the guided new-visit wizard (MoD.5) — client → meds →
 * services/notes → review → done. The flow spans five routes, and the meds cart
 * is a productId→qty map, so router params (string-only) can't carry it.
 *
 * UI STATE ONLY. No financial truth lives here: the review screen recomputes
 * contract/batch links fresh on confirm and composes the EXISTING writers
 * (`syncInsert`, `buildFieldInvoiceRequest`/`buildExamFeeInvoiceRequest` via
 * `sendOrQueue`) — see `app/visits/new/review.tsx`.
 */
export interface WizardResult {
  visitId: string;
  customerId: string;
  customerName: string;
  visitNumber: string | null;
  /** Catalog/contract estimate shown on the done screen — never the billed truth. */
  total: number;
}

interface VisitWizardState {
  customerId: string | null;
  farmId: string | null;
  petId: string | null;
  /** productId → quantity (meds step). */
  cart: Record<string, number>;
  /** serviceId → selected (services step). */
  services: Record<string, boolean>;
  examFeeEnabled: boolean;
  /** Editable amount; null = let the server fall back to the default fee. */
  examFee: number | null;
  notes: string;
  nextDose: { vaccineType: string; dueDate: string } | null;
  /** Set by review's confirm so the done screen can render the summary. */
  result: WizardResult | null;

  setCustomer: (id: string | null) => void;
  setFarm: (id: string | null) => void;
  setPet: (id: string | null) => void;
  setQty: (productId: string, qty: number) => void;
  toggleService: (serviceId: string) => void;
  setExamFeeEnabled: (enabled: boolean) => void;
  setExamFee: (amount: number | null) => void;
  setNotes: (notes: string) => void;
  setNextDose: (dose: { vaccineType: string; dueDate: string } | null) => void;
  setResult: (result: WizardResult) => void;
  reset: () => void;
}

const EMPTY = {
  customerId: null,
  farmId: null,
  petId: null,
  cart: {},
  services: {},
  examFeeEnabled: false,
  examFee: null,
  notes: "",
  nextDose: null,
  result: null,
} as const;

export const useVisitWizardStore = create<VisitWizardState>()((set) => ({
  ...EMPTY,

  // Switching customer invalidates the farm/pet links (they belong to the customer).
  setCustomer: (id) =>
    set((s) => (s.customerId === id ? s : { ...EMPTY, customerId: id, result: null })),
  setFarm: (id) => set({ farmId: id }),
  setPet: (id) => set({ petId: id }),
  setQty: (productId, qty) =>
    set((s) => {
      const cart = { ...s.cart };
      if (qty <= 0) delete cart[productId];
      else cart[productId] = qty;
      return { cart };
    }),
  toggleService: (serviceId) =>
    set((s) => ({ services: { ...s.services, [serviceId]: !s.services[serviceId] } })),
  setExamFeeEnabled: (enabled) => set({ examFeeEnabled: enabled }),
  setExamFee: (amount) => set({ examFee: amount }),
  setNotes: (notes) => set({ notes }),
  setNextDose: (dose) => set({ nextDose: dose }),
  setResult: (result) => set({ result }),
  reset: () => set({ ...EMPTY }),
}));
