import { z } from "zod";

// ---- Batch settlement / تصفية الدورة (M24) --------------------------------

/**
 * One re-priceable product aggregated across the batch's effective invoice lines
 * (GET /batches/{id}/settlement/preview). `unitPrices` lists the distinct billed prices (usually
 * one); `weightedAveragePrice` is the delta-neutral prefill — settling at it yields a zero delta.
 * `contractPrice` is a display hint: the active contract override as of today, when one applies.
 */
export const SettlementPreviewProductSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPrices: z.array(z.number()),
  weightedAveragePrice: z.number(),
  contractPrice: z.number().nullish(),
  originalAmount: z.number(),
});
export type SettlementPreviewProduct = z.infer<typeof SettlementPreviewProductSchema>;

export const SettlementPreviewInvoiceSchema = z.object({
  invoiceId: z.string(),
  number: z.string().nullish(),
  invoiceType: z.string(),
  issuedAt: z.string(),
  total: z.number(),
});
export type SettlementPreviewInvoice = z.infer<typeof SettlementPreviewInvoiceSchema>;

/**
 * The settle screen's read model (GET /batches/{id}/settlement/preview): the batch's terms, its
 * effective (non-void) invoices, the per-product aggregation to re-price, the owner-ledger position,
 * and the guard flags that block settling (`alreadySettled` / `ledgerClosed` / `entitlementFrozen`).
 */
export const BatchSettlementPreviewSchema = z.object({
  batchId: z.string(),
  batchStatus: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  farmId: z.string().nullish(),
  farmName: z.string().nullish(),
  responsibleDoctorId: z.string(),
  doctorName: z.string(),
  animalCount: z.number(),
  startDate: z.string(),
  endDate: z.string().nullish(),
  supervisionFeeModel: z.string(),
  supervisionFeeValue: z.number(),
  entitlementEnabled: z.boolean().nullish(),
  entitlementSystem: z.string().nullish(),
  /** M28 — the supervision fee projected on `originalTotal` (= the doctor's entitlement when enabled). */
  supervisionFee: z.number(),
  originalTotal: z.number(),
  /**
   * The cycle's charges not yet on the owner ledger. Batch (Dawra) invoices defer their ledger post to
   * settlement, so their value is absent from `ledgerBalance` until تصفية. The settle screen adds this
   * to the projected post-settle balance (`ledgerBalance` already excludes it).
   */
  deferredTotal: z.number(),
  ledgerId: z.string().nullish(),
  ledgerBalance: z.number(),
  ledgerStatus: z.string(),
  alreadySettled: z.boolean(),
  settledAt: z.string().nullish(),
  ledgerClosed: z.boolean(),
  entitlementFrozen: z.boolean(),
  products: z.array(SettlementPreviewProductSchema),
  invoices: z.array(SettlementPreviewInvoiceSchema),
});
export type BatchSettlementPreview = z.infer<typeof BatchSettlementPreviewSchema>;

/**
 * Settle payload (POST /batches/{id}/settle) — one negotiated price per product; products omitted
 * keep their original resolution (settlement → contract → invoice line). `discountAmount` is the
 * batch-level خصم (reduces the farmer's debt AND the System-A doctor-share basis). An empty `lines`
 * with zero discount is the plain "close the cycle" path. Irreversible: closes the batch, posts the
 * ledger adjustments, computes the entitlement on the settled numbers, and freezes the batch's
 * invoices (invariant #11). Online-only, gated on `contracts.activate`.
 */
export const BatchSettleRequestSchema = z.object({
  lines: z.array(
    z.object({
      productId: z.string().min(1),
      settledUnitPrice: z.number().min(0),
    }),
  ),
  discountAmount: z.number().min(0),
  notes: z.string().optional(),
});
export type BatchSettleRequest = z.infer<typeof BatchSettleRequestSchema>;

export const BatchSettlementLineSchema = z.object({
  productId: z.string(),
  settledUnitPrice: z.number(),
  originalQuantity: z.number(),
  originalAmount: z.number(),
  delta: z.number(),
});
export type BatchSettlementLine = z.infer<typeof BatchSettlementLineSchema>;

/** The settlement document (GET /batches/{id}/settlement; 404 until settled). */
export const BatchSettlementSchema = z.object({
  id: z.string(),
  batchId: z.string(),
  repricingDelta: z.number(),
  discountAmount: z.number(),
  originalTotal: z.number(),
  settledTotal: z.number(),
  /** M28 — the supervision fee snapshot computed on the settled (pre-discount) revenue. For a
   *  `direct_fee` batch it's added to `settledTotal` and posted as a +fee owner-ledger adjustment. */
  supervisionFee: z.number(),
  notes: z.string().nullish(),
  settledBy: z.string(),
  settledAt: z.string(),
  lines: z.array(BatchSettlementLineSchema),
});
export type BatchSettlement = z.infer<typeof BatchSettlementSchema>;
