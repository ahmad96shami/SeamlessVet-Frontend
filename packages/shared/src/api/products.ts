import type { AxiosInstance } from "axios";
import { z } from "zod";

import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  ProductRequestSchema,
  ProductResponseSchema,
  type ProductListParams,
  type ProductRequest,
  type ProductResponse,
} from "../schemas/products";

const ProductListSchema = z.array(ProductResponseSchema);

/** GET /admin/products — offset-paged, optional search / category filter. */
export async function listProducts(
  client: AxiosInstance,
  params?: ProductListParams,
): Promise<ProductResponse[]> {
  const res = await client.get("/admin/products", { params });
  return ProductListSchema.parse(res.data);
}

/** GET /admin/products/{id}. */
export async function getProduct(client: AxiosInstance, id: string): Promise<ProductResponse> {
  const res = await client.get(`/admin/products/${id}`);
  return ProductResponseSchema.parse(res.data);
}

/** POST /admin/products — create (send a client-generated GUID v7 `id`). Returns the new id. */
export async function createProduct(
  client: AxiosInstance,
  body: ProductRequest,
): Promise<IdentifierResponse> {
  const payload = ProductRequestSchema.parse(body);
  const res = await client.post("/admin/products", payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /admin/products/{id} — partial update (`id` lives in the URL, never the body). */
export async function updateProduct(
  client: AxiosInstance,
  id: string,
  body: ProductRequest,
): Promise<IdentifierResponse> {
  const payload = ProductRequestSchema.parse(body);
  const res = await client.patch(`/admin/products/${id}`, { ...payload, id: undefined });
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /admin/products/{id} — soft delete. */
export async function deleteProduct(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/admin/products/${id}`);
}
