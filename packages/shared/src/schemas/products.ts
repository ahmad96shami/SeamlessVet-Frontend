import { z } from "zod";

import { optionalText } from "./common";

/**
 * M26 — vaccines are products with this category: managed from the web اللقاحات tab (CRUD as
 * products with cost/expiry/reorder), purchasable in the line builder, sold from the POS vaccines
 * chip, and linkable from `vaccinations.productId`. Reverses the M22 vaccines-as-services model.
 */
export const VACCINE_CATEGORY = "vaccine";

/** A products-catalog row (GET /admin/products[/{id}]). Prices are decimals → JSON numbers. */
export const ProductResponseSchema = z.object({
  id: z.string(),
  nameAr: z.string(),
  nameLatin: z.string().nullish(),
  barcode: z.string().nullish(),
  category: z.string(),
  manufacturer: z.string().nullish(),
  supplier: z.string().nullish(),
  purchasePrice: z.number(),
  sellingPrice: z.number(),
  unitOfMeasure: z.string().nullish(),
  expirationDate: z.string().nullish(), // DateOnly → "yyyy-MM-dd"
  reorderPoint: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProductResponse = z.infer<typeof ProductResponseSchema>;

/**
 * Create/replace payload (POST /admin/products). `id` is a client-generated GUID v7 (sync
 * convention — the same row later flows to mobile via the PowerSync `reference` bucket).
 * `category` mirrors the ProductCategory enum (`medication` | `product` | `vaccine`).
 */
export const ProductRequestSchema = z.object({
  id: z.string().optional(),
  nameAr: z.string().min(1),
  nameLatin: optionalText,
  barcode: optionalText,
  category: z.enum(["medication", "product", "vaccine"]),
  manufacturer: optionalText,
  supplier: optionalText,
  purchasePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  unitOfMeasure: optionalText,
  expirationDate: optionalText,
  reorderPoint: z.number().min(0),
});
export type ProductRequest = z.infer<typeof ProductRequestSchema>;

export interface ProductListParams {
  search?: string;
  category?: string;
  skip?: number;
  take?: number;
}
