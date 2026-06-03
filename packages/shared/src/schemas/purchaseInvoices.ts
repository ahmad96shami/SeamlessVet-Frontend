import { z } from "zod";

import { optionalText } from "./common";

// ---- Reads (GET /purchase-invoices[/{id}]) --------------------------------

/**
 * One line of a purchase invoice — M19 (SCHEMA §4). Always a product (purchases are goods, never
 * services). `unitCost` is the per-unit cost snapshotted at receipt — the supplier-side mirror of
 * `InvoiceItem.costPrice`. `lineTotal = quantity × unitCost − discountAmount` (server-rounded).
 */
export const PurchaseInvoiceItemResponseSchema = z.object({
  id: z.string(),
  purchaseInvoiceId: z.string(),
  productId: z.string(),
  quantity: z.number(),
  unitCost: z.number(),
  discountAmount: z.number(),
  lineTotal: z.number(),
});
export type PurchaseInvoiceItemResponse = z.infer<typeof PurchaseInvoiceItemResponseSchema>;

/**
 * An issued purchase invoice (GET /purchase-invoices[/{id}]) — M19. Append-only. Issuing one (a) wrote
 * a signed `receive` movement per line into the warehouse, (b) snapshotted unit costs, and (c) posted
 * the full `total` as a payable to the supplier ledger. `number` is the supplier's own reference (may
 * be null). The list endpoint returns an untyped 200, so this schema is the contract.
 */
export const PurchaseInvoiceResponseSchema = z.object({
  id: z.string(),
  supplierId: z.string(),
  warehouseId: z.string(),
  number: z.string().nullish(),
  subtotal: z.number(),
  discountAmount: z.number(),
  taxAmount: z.number(),
  total: z.number(),
  receivedBy: z.string(),
  receivedAt: z.string(),
  notes: z.string().nullish(),
  items: z.array(PurchaseInvoiceItemResponseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PurchaseInvoiceResponse = z.infer<typeof PurchaseInvoiceResponseSchema>;

/** Query params for the purchase-invoices list — offset-paged; filter by supplierId. */
export interface PurchaseInvoiceListParams {
  supplierId?: string;
  skip?: number;
  take?: number;
}

// ---- Write (POST /purchase-invoices) --------------------------------------
// Subtotal / total are NEVER sent — the server computes them. `warehouseId` defaults to the
// environment's central warehouse when omitted. `taxAmount` is the supplier's input VAT (optional).
// The wrapper mints the invoice `id` (GUID v7) + the `idempotencyKey`, so the `*Input` type carries
// only what the form collects.

/** One requested line: a product, a quantity, and the per-unit cost the clinic paid. */
export const PurchaseInvoiceLineRequestSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
});
export type PurchaseInvoiceLineRequest = z.infer<typeof PurchaseInvoiceLineRequestSchema>;

/** Purchase-invoice issuance (POST /purchase-invoices) — receives goods + posts the payable. */
export const PurchaseInvoiceRequestSchema = z.object({
  id: z.string().optional(),
  supplierId: z.string().min(1),
  warehouseId: z.string().min(1).optional(),
  number: optionalText,
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).optional(),
  items: z.array(PurchaseInvoiceLineRequestSchema).min(1),
  notes: optionalText,
  idempotencyKey: z.string().min(1).max(128),
});
export type PurchaseInvoiceRequest = z.infer<typeof PurchaseInvoiceRequestSchema>;
export type PurchaseInvoiceInput = Omit<PurchaseInvoiceRequest, "id" | "idempotencyKey">;
