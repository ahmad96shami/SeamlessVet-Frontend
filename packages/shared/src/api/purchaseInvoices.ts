import type { AxiosInstance } from "axios";
import { z } from "zod";

import { idempotencyKey, newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  PurchaseInvoiceRequestSchema,
  PurchaseInvoiceResponseSchema,
  type PurchaseInvoiceInput,
  type PurchaseInvoiceListParams,
  type PurchaseInvoiceResponse,
} from "../schemas/purchaseInvoices";

const PurchaseInvoiceListSchema = z.array(PurchaseInvoiceResponseSchema);

// M19 purchase invoices are online-only center-web (no sync scope). Issuance mints the invoice GUID v7
// `id` + one idempotency key, sent in the body (row-level dedup in the service); the host apiClient
// injects the `Idempotency-Key` header (request-level dedup) on POST.

/** GET /purchase-invoices — newest-first, offset-paged; filter by supplierId. */
export async function listPurchaseInvoices(
  client: AxiosInstance,
  params?: PurchaseInvoiceListParams,
): Promise<PurchaseInvoiceResponse[]> {
  const res = await client.get("/purchase-invoices", { params });
  return PurchaseInvoiceListSchema.parse(res.data);
}

/** GET /purchase-invoices/{id} — a single purchase invoice with its line items. */
export async function getPurchaseInvoice(
  client: AxiosInstance,
  id: string,
): Promise<PurchaseInvoiceResponse> {
  const res = await client.get(`/purchase-invoices/${id}`);
  return PurchaseInvoiceResponseSchema.parse(res.data);
}

/**
 * POST /purchase-invoices — issue a purchase invoice: one transaction receives the goods into the
 * warehouse (a signed `receive` movement per line), snapshots unit costs, and posts the full total as
 * a payable to the supplier ledger. Returns only `{ id }`; refetch to render the receipt.
 */
export async function createPurchaseInvoice(
  client: AxiosInstance,
  input: PurchaseInvoiceInput,
): Promise<IdentifierResponse> {
  const body = PurchaseInvoiceRequestSchema.parse({
    ...input,
    id: newGuidV7(),
    idempotencyKey: idempotencyKey(),
  });
  const res = await client.post("/purchase-invoices", body);
  return IdentifierResponseSchema.parse(res.data);
}
