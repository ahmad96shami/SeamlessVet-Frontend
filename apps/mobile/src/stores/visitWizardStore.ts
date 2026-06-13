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
  /**
   * Mo11 — the supervision batch (Dawra) this visit falls under, or null for a standalone field
   * visit. A visit under a batch is covered by the batch supervision fee, so the كشفية toggle is
   * hidden downstream (mirrors the backend `exam_fee_covered_by_batch` guard). `batchInitialized`
   * gates the one-time auto-default to the open batch so it doesn't clobber an explicit opt-out
   * (e.g. on back-navigation); it resets whenever the customer/farm context changes.
   */
  batchId: string | null;
  batchInitialized: boolean;
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
  /** Explicit batch pick (or null = "no batch"); marks the choice so auto-default won't re-fire. */
  setBatch: (id: string | null) => void;
  /** One-time auto-default to the open batch; no-op once a choice has been made for this context. */
  initBatch: (id: string | null) => void;
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
  batchId: null,
  batchInitialized: false,
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
  // Switching farm re-scopes the batch — drop the old farm's batch and let the selector re-default.
  setFarm: (id) =>
    set((s) => (s.farmId === id ? s : { farmId: id, batchId: null, batchInitialized: false })),
  setPet: (id) => set({ petId: id }),
  setBatch: (id) => set({ batchId: id, batchInitialized: true }),
  initBatch: (id) => set((s) => (s.batchInitialized ? s : { batchId: id, batchInitialized: true })),
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
