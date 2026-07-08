import type { AxiosInstance } from "axios";
import { z } from "zod";

import { idempotencyKey, newGuidV7 } from "../http/idempotency";
import { sendRequest, type RequestDescriptor } from "../offline/queue";
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

/** GET /invoices — newest-first, offset-paged; filters customerId / visitId / status / search. */
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

/**
 * Build the `POST /pos/invoices` request — mints the invoice GUID v7 `id` + one idempotency key,
 * sent BOTH in the body (invoice-level dedup in the service) and as the header (request-level
 * dedup). `descriptor.entityId` is the invoice id, so an offline sale can print from local data
 * and reconcile on replay.
 */
export function buildPosInvoiceRequest(input: PosInvoiceInput): RequestDescriptor {
  const key = idempotencyKey();
  const id = newGuidV7();
  const body = PosInvoiceRequestSchema.parse({ ...input, id, idempotencyKey: key });
  return {
    method: "POST",
    url: "/pos/invoices",
    body,
    idempotencyKey: key,
    label: "sync.label.posSale",
    entityKind: "invoice",
    entityId: id,
  };
}

/** POST /pos/invoices — POS issuance (walk-in, or customer/visit-linked). */
export async function issuePosInvoice(
  client: AxiosInstance,
  input: PosInvoiceInput,
): Promise<IdentifierResponse> {
  const data = await sendRequest(client, buildPosInvoiceRequest(input));
  return IdentifierResponseSchema.parse(data);
}

/**
 * Build the `POST /visits/{visitId}/field-invoice` request — mints the invoice GUID v7 `id` +
 * one idempotency key (body + header), so an offline replay applies at most once. `entityId` is
 * the invoice id so the optimistic refetch can target it on reconnect (Mo4.2).
 */
export function buildFieldInvoiceRequest(visitId: string, input: FieldInvoiceInput): RequestDescriptor {
  const key = idempotencyKey();
  const id = newGuidV7();
  const body = FieldInvoiceRequestSchema.parse({ ...input, id, idempotencyKey: key });
  return {
    method: "POST",
    url: `/visits/${visitId}/field-invoice`,
    body,
    idempotencyKey: key,
    label: "sync.label.fieldInvoice",
    entityKind: "invoice",
    entityId: id,
  };
}

/** POST /visits/{visitId}/field-invoice — field-visit invoice (shared wrapper; field/mobile surface). */
export async function issueFieldInvoice(
  client: AxiosInstance,
  visitId: string,
  input: FieldInvoiceInput,
): Promise<IdentifierResponse> {
  const data = await sendRequest(client, buildFieldInvoiceRequest(visitId, input));
  return IdentifierResponseSchema.parse(data);
}

/**
 * Build the `POST /visits/{visitId}/exam-fee-invoice` request — standalone Kashfiyya. Same id +
 * stable key + body/header dance as the field-invoice builder; entityKind=`invoice` so the
 * mobile sync panel groups it alongside the field-invoice entry.
 */
export function buildExamFeeInvoiceRequest(
  visitId: string,
  input: ExamFeeInvoiceInput,
): RequestDescriptor {
  const key = idempotencyKey();
  const id = newGuidV7();
  const body = ExamFeeInvoiceRequestSchema.parse({ ...input, id, idempotencyKey: key });
  return {
    method: "POST",
    url: `/visits/${visitId}/exam-fee-invoice`,
    body,
    idempotencyKey: key,
    label: "sync.label.examFeeInvoice",
    entityKind: "invoice",
    entityId: id,
  };
}

/** POST /visits/{visitId}/exam-fee-invoice — standalone Kashfiyya invoice (shared wrapper). */
export async function issueExamFeeInvoice(
  client: AxiosInstance,
  visitId: string,
  input: ExamFeeInvoiceInput,
): Promise<IdentifierResponse> {
  const data = await sendRequest(client, buildExamFeeInvoiceRequest(visitId, input));
  return IdentifierResponseSchema.parse(data);
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
