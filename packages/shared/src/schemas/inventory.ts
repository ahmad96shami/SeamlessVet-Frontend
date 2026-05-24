import { z } from "zod";

import { optionalText } from "./common";

// ---- Reads (GET /inventory/*) ---------------------------------------------

/**
 * A current on-hand row (GET /inventory/stock) — a `stock_items ⋈ products` projection at one
 * location. `reorderPoint`/`expirationDate` come from the product; `belowReorderPoint` is the
 * low-stock flag, computed server-side with the M11 scan threshold
 * (`quantity ≤ reorderPoint × (1 + low_stock_threshold_pct/100)`).
 */
export const StockLevelResponseSchema = z.object({
  productId: z.string(),
  nameAr: z.string(),
  nameLatin: z.string().nullish(),
  barcode: z.string().nullish(),
  locationType: z.string(),
  locationId: z.string(),
  quantity: z.number(),
  reorderPoint: z.number(),
  expirationDate: z.string().nullish(), // DateOnly → "yyyy-MM-dd"
  belowReorderPoint: z.boolean(),
});
export type StockLevelResponse = z.infer<typeof StockLevelResponseSchema>;

/** A movement-history row (GET /inventory/movements). Append-only; `quantityDelta` is signed. */
export const InventoryMovementResponseSchema = z.object({
  id: z.string(),
  productId: z.string(),
  movementType: z.string(),
  fromLocationType: z.string().nullish(),
  fromLocationId: z.string().nullish(),
  toLocationType: z.string().nullish(),
  toLocationId: z.string().nullish(),
  quantityDelta: z.number(),
  reason: z.string().nullish(),
  visitId: z.string().nullish(),
  invoiceId: z.string().nullish(),
  performedBy: z.string(),
  createdAt: z.string(),
});
export type InventoryMovementResponse = z.infer<typeof InventoryMovementResponseSchema>;

/** A field doctor's inventory (GET /inventory/field-inventories) — the load/unload picker source. */
export const FieldInventoryResponseSchema = z.object({
  id: z.string(),
  doctorId: z.string(),
  doctorName: z.string(),
});
export type FieldInventoryResponse = z.infer<typeof FieldInventoryResponseSchema>;

export interface StockListParams {
  locationType?: string;
  locationId?: string;
  productId?: string;
  search?: string;
  lowStockOnly?: boolean;
  skip?: number;
  take?: number;
}

export interface MovementListParams {
  productId?: string;
  locationType?: string;
  locationId?: string;
  movementType?: string;
  from?: string; // "yyyy-MM-dd"
  to?: string; // "yyyy-MM-dd"
  skip?: number;
  take?: number;
}

// ---- Writes (POST /inventory/*) — delta intents, never an absolute quantity ----
// Mirrors the backend FluentValidation rules. The wire body also carries a client GUID v7 `id`
// (the movement id) and an `idempotencyKey`; both are minted by the api wrappers, so the `*Input`
// types below carry only the business fields a form collects.

/** Purchase-order receipt into a warehouse (defaults to the env's single central warehouse). */
export const ReceiveStockRequestSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1),
  quantity: z.number().positive(),
  warehouseId: z.string().optional(),
  reason: optionalText,
  idempotencyKey: z.string().min(1).max(128),
});
export type ReceiveStockRequest = z.infer<typeof ReceiveStockRequestSchema>;
export type ReceiveStockInput = Omit<ReceiveStockRequest, "id" | "idempotencyKey">;

/** Signed adjustment at one location, with a mandatory reason. */
export const AdjustStockRequestSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1),
  locationType: z.enum(["warehouse", "field"]),
  locationId: z.string().min(1),
  quantityDelta: z.number().refine((n) => n !== 0, { message: "nonzero" }),
  reason: z.string().min(1).max(512),
  idempotencyKey: z.string().min(1).max(128),
});
export type AdjustStockRequest = z.infer<typeof AdjustStockRequestSchema>;
export type AdjustStockInput = Omit<AdjustStockRequest, "id" | "idempotencyKey">;

/** Move stock from the central warehouse into a field doctor's inventory (two-leg transfer). */
export const LoadFieldRequestSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1),
  fieldInventoryId: z.string().min(1),
  quantity: z.number().positive(),
  warehouseId: z.string().optional(),
  reason: optionalText,
  idempotencyKey: z.string().min(1).max(128),
});
export type LoadFieldRequest = z.infer<typeof LoadFieldRequestSchema>;
export type LoadFieldInput = Omit<LoadFieldRequest, "id" | "idempotencyKey">;

/** Return stock from a field doctor's inventory back to the central warehouse (two-leg transfer). */
export const UnloadFieldRequestSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1),
  fieldInventoryId: z.string().min(1),
  quantity: z.number().positive(),
  warehouseId: z.string().optional(),
  reason: optionalText,
  idempotencyKey: z.string().min(1).max(128),
});
export type UnloadFieldRequest = z.infer<typeof UnloadFieldRequestSchema>;
export type UnloadFieldInput = Omit<UnloadFieldRequest, "id" | "idempotencyKey">;
