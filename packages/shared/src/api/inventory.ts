import type { AxiosInstance } from "axios";
import { z } from "zod";

import { IDEMPOTENCY_HEADER } from "../constants";
import { idempotencyKey, newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  AdjustStockRequestSchema,
  FieldInventoryResponseSchema,
  InventoryMovementResponseSchema,
  LoadFieldRequestSchema,
  ReceiveStockRequestSchema,
  StockLevelResponseSchema,
  UnloadFieldRequestSchema,
  type AdjustStockInput,
  type FieldInventoryResponse,
  type InventoryMovementResponse,
  type LoadFieldInput,
  type MovementListParams,
  type ReceiveStockInput,
  type StockLevelResponse,
  type StockListParams,
  type UnloadFieldInput,
} from "../schemas/inventory";

const StockListSchema = z.array(StockLevelResponseSchema);
const MovementListSchema = z.array(InventoryMovementResponseSchema);
const FieldInventoryListSchema = z.array(FieldInventoryResponseSchema);

// ---- Reads ----------------------------------------------------------------

/** GET /inventory/stock — current on-hand per (product, location); offset-paged. */
export async function listStock(
  client: AxiosInstance,
  params?: StockListParams,
): Promise<StockLevelResponse[]> {
  const res = await client.get("/inventory/stock", { params });
  return StockListSchema.parse(res.data);
}

/** GET /inventory/movements — append-only movement history, newest first; offset-paged. */
export async function listMovements(
  client: AxiosInstance,
  params?: MovementListParams,
): Promise<InventoryMovementResponse[]> {
  const res = await client.get("/inventory/movements", { params });
  return MovementListSchema.parse(res.data);
}

/** GET /inventory/field-inventories — field doctors' inventories (load/unload picker). */
export async function listFieldInventories(
  client: AxiosInstance,
): Promise<FieldInventoryResponse[]> {
  const res = await client.get("/inventory/field-inventories");
  return FieldInventoryListSchema.parse(res.data);
}

// ---- Writes (delta intents) -----------------------------------------------
// The four writes share a shape: the caller passes only business fields; the wrapper mints a
// movement GUID v7 `id` and a single idempotency key sent BOTH in the body (movement-level dedup in
// the inventory service) and as the `Idempotency-Key` header (request-level dedup). This is online
// single-submit for W2; the W7 offline queue will own stable keys for safe replay.

async function postDelta(
  client: AxiosInstance,
  path: string,
  payload: unknown,
  key: string,
): Promise<IdentifierResponse> {
  const res = await client.post(path, payload, { headers: { [IDEMPOTENCY_HEADER]: key } });
  return IdentifierResponseSchema.parse(res.data);
}

/** POST /inventory/receive — receive stock into a warehouse. */
export async function receiveStock(
  client: AxiosInstance,
  input: ReceiveStockInput,
): Promise<IdentifierResponse> {
  const key = idempotencyKey();
  const payload = ReceiveStockRequestSchema.parse({ ...input, id: newGuidV7(), idempotencyKey: key });
  return postDelta(client, "/inventory/receive", payload, key);
}

/** POST /inventory/adjust — signed adjustment at a location, with reason. */
export async function adjustStock(
  client: AxiosInstance,
  input: AdjustStockInput,
): Promise<IdentifierResponse> {
  const key = idempotencyKey();
  const payload = AdjustStockRequestSchema.parse({ ...input, id: newGuidV7(), idempotencyKey: key });
  return postDelta(client, "/inventory/adjust", payload, key);
}

/** POST /inventory/load-field — warehouse → field transfer. */
export async function loadField(
  client: AxiosInstance,
  input: LoadFieldInput,
): Promise<IdentifierResponse> {
  const key = idempotencyKey();
  const payload = LoadFieldRequestSchema.parse({ ...input, id: newGuidV7(), idempotencyKey: key });
  return postDelta(client, "/inventory/load-field", payload, key);
}

/** POST /inventory/unload-field — field → warehouse transfer. */
export async function unloadField(
  client: AxiosInstance,
  input: UnloadFieldInput,
): Promise<IdentifierResponse> {
  const key = idempotencyKey();
  const payload = UnloadFieldRequestSchema.parse({ ...input, id: newGuidV7(), idempotencyKey: key });
  return postDelta(client, "/inventory/unload-field", payload, key);
}
