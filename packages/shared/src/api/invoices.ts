import type { AxiosInstance } from "axios";
import { z } from "zod";

import { IDEMPOTENCY_HEADER } from "../constants";
import { idempotencyKey, newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  ExamFeeInvoiceRequestSchema,
  FieldInvoiceRequestSchema,
  InvoiceResponseSchema,
  PosInvoiceRequestSchema,
  type ExamFeeInvoiceInput,
  type FieldInvoiceInput,
  type InvoiceListParams,
  type InvoiceResponse,
  type PosInvoiceInput,
} from "../schemas/invoices";

const InvoiceListSchema = z.array(InvoiceResponseSchema);

// ---- Reads ----------------------------------------------------------------

/** GET /invoices — newest-first, offset-paged; filters customerId / visitId / status. */
export async function listInvoices(
  client: AxiosInstance,
  params?: InvoiceListParams,
): Promise<InvoiceResponse[]> {
  const res = await client.get("/invoices", { params });
  return InvoiceListSchema.parse(res.data);
}

/** GET /invoices/{id} — a single invoice with its items + payments. */
export async function getInvoice(client: AxiosInstance, id: string): Promise<InvoiceResponse> {
  const res = await client.get(`/invoices/${id}`);
  return InvoiceResponseSchema.parse(res.data);
}

// ---- Writes ---------------------------------------------------------------
// Each issuance mints the invoice GUID v7 `id` + one idempotency key, sent BOTH in the body
// (invoice-level dedup in the service) and as the `Idempotency-Key` header (request-level dedup) —
// the inventory delta-intent pattern. Issuance returns only `{ id }`; refetch GET /invoices/{id} to
// render the receipt.

/** POST /pos/invoices — POS issuance (walk-in, or customer/visit-linked). */
export async function issuePosInvoice(
  client: AxiosInstance,
  input: PosInvoiceInput,
): Promise<IdentifierResponse> {
  const key = idempotencyKey();
  const payload = PosInvoiceRequestSchema.parse({ ...input, id: newGuidV7(), idempotencyKey: key });
  const res = await client.post("/pos/invoices", payload, {
    headers: { [IDEMPOTENCY_HEADER]: key },
  });
  return IdentifierResponseSchema.parse(res.data);
}

/** POST /visits/{visitId}/field-invoice — field-visit invoice (shared wrapper; field/mobile surface). */
export async function issueFieldInvoice(
  client: AxiosInstance,
  visitId: string,
  input: FieldInvoiceInput,
): Promise<IdentifierResponse> {
  const key = idempotencyKey();
  const payload = FieldInvoiceRequestSchema.parse({ ...input, id: newGuidV7(), idempotencyKey: key });
  const res = await client.post(`/visits/${visitId}/field-invoice`, payload, {
    headers: { [IDEMPOTENCY_HEADER]: key },
  });
  return IdentifierResponseSchema.parse(res.data);
}

/** POST /visits/{visitId}/exam-fee-invoice — standalone Kashfiyya invoice (shared wrapper). */
export async function issueExamFeeInvoice(
  client: AxiosInstance,
  visitId: string,
  input: ExamFeeInvoiceInput,
): Promise<IdentifierResponse> {
  const key = idempotencyKey();
  const payload = ExamFeeInvoiceRequestSchema.parse({ ...input, id: newGuidV7(), idempotencyKey: key });
  const res = await client.post(`/visits/${visitId}/exam-fee-invoice`, payload, {
    headers: { [IDEMPOTENCY_HEADER]: key },
  });
  return IdentifierResponseSchema.parse(res.data);
}

/**
 * POST /invoices/{id}/void — appends a `status='void'` row + a compensating ledger entry; the
 * original is untouched and inventory is NOT auto-reversed. No request body; the service is
 * idempotent (re-voiding returns the existing void row). Returns the void row's id.
 */
export async function voidInvoice(client: AxiosInstance, id: string): Promise<IdentifierResponse> {
  const res = await client.post(`/invoices/${id}/void`);
  return IdentifierResponseSchema.parse(res.data);
}
