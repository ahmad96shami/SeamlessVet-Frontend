import { z } from "zod";

import { optionalText } from "./common";

// ---- Reads (GET /invoices[/{id}]) -----------------------------------------

/**
 * One line of an issued invoice (GET /invoices). References a product OR a service (typed pair).
 * `costPrice` is the server's sale-time snapshot of the product purchase price (0 for services);
 * `lineTotal = quantity × unitPrice − discountAmount` (server-rounded). `prescriptionId` /
 * `procedureId` back-link a line the issuance assembler auto-added from a visit's unbilled charges.
 * The list endpoint returns an untyped 200, so this schema is the contract.
 */
export const InvoiceItemResponseSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  productId: z.string().nullish(),
  serviceId: z.string().nullish(),
  description: z.string().nullish(),
  quantity: z.number(),
  unitPrice: z.number(),
  costPrice: z.number(),
  discountAmount: z.number(),
  lineTotal: z.number(),
  prescriptionId: z.string().nullish(),
  procedureId: z.string().nullish(),
});
export type InvoiceItemResponse = z.infer<typeof InvoiceItemResponseSchema>;

/**
 * A payment leg recorded against an invoice (a mixed payment → several rows). M19: a `cheque` leg
 * carries optional reference metadata (null on other methods).
 */
export const PaymentResponseSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  method: z.string(),
  amount: z.number(),
  paidAt: z.string(),
  chequeNumber: z.string().nullish(),
  chequeBank: z.string().nullish(),
  chequeDueDate: z.string().nullish(),
});
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;

/**
 * An issued invoice (GET /invoices[/{id}]). `invoiceType` ∈ pos|field|exam_fee; `status` ∈
 * issued|flagged|void. Totals are server-computed (tax from system_settings). A `void` row carries
 * negated totals and points at the original via `voidOfInvoiceId`; the original row stays untouched.
 * `customerId` null = walk-in (no ledger). `number` is null on void rows and on web-created invoices
 * (no per-user prefix source client-side).
 */
export const InvoiceResponseSchema = z.object({
  id: z.string(),
  invoiceType: z.string(),
  customerId: z.string().nullish(),
  visitId: z.string().nullish(),
  batchId: z.string().nullish(),
  number: z.string().nullish(),
  subtotal: z.number(),
  discountAmount: z.number(),
  taxAmount: z.number(),
  total: z.number(),
  status: z.string(),
  issuedBy: z.string(),
  issuedAt: z.string(),
  voidOfInvoiceId: z.string().nullish(),
  items: z.array(InvoiceItemResponseSchema),
  payments: z.array(PaymentResponseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InvoiceResponse = z.infer<typeof InvoiceResponseSchema>;

/** Query params for the invoices list — offset-paged; ordered by `issuedAt DESC` server-side. */
export interface InvoiceListParams {
  customerId?: string;
  visitId?: string;
  status?: string;
  skip?: number;
  take?: number;
}

// ---- Writes (POST /pos/invoices, /visits/{id}/field-invoice|exam-fee-invoice) ----
// Mirror the backend FluentValidation rules. Tax / subtotal / total are NEVER sent — the server
// computes them (tax from system_settings). The product⊕service XOR is enforced by the form (a
// catalog item is one or the other) and re-checked server-side. The api wrappers mint the invoice
// `id` (GUID v7) + the `idempotencyKey`, so the `*Input` types carry only what a form collects.

/** One requested line: exactly one of productId/serviceId; omit unitPrice to bill at catalog price. */
export const InvoiceLineRequestSchema = z.object({
  productId: z.string().optional(),
  serviceId: z.string().optional(),
  description: optionalText,
  quantity: z.number().positive(),
  unitPrice: z.number().min(0).optional(),
  discountAmount: z.number().min(0).default(0),
});
export type InvoiceLineRequest = z.infer<typeof InvoiceLineRequestSchema>;

/**
 * A payment leg. `method` mirrors the PaymentMethod enum (cash | card | bank_transfer | credit |
 * cheque). M19: a `cheque` leg settles immediately (like cash) and may carry optional reference
 * metadata (number / bank / due date) — stored server-side, ignored on the other methods.
 */
export const PaymentRequestSchema = z.object({
  id: z.string().optional(),
  method: z.enum(["cash", "card", "bank_transfer", "credit", "cheque"]),
  amount: z.number().positive(),
  chequeNumber: z.string().trim().max(64).optional(),
  chequeBank: z.string().trim().max(128).optional(),
  chequeDueDate: z.string().optional(),
});
export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;

/**
 * POS issuance (POST /pos/invoices). `customerId` null = walk-in (no ledger). When `visitId` is set
 * the server auto-assembles that visit's unbilled dispensed-to-owner prescriptions + procedures as
 * extra lines. Needs ≥1 explicit line OR a linked visit (server-enforced).
 */
export const PosInvoiceRequestSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().optional(),
  visitId: z.string().optional(),
  number: optionalText,
  discountAmount: z.number().min(0).default(0),
  items: z.array(InvoiceLineRequestSchema),
  payments: z.array(PaymentRequestSchema),
  idempotencyKey: z.string().min(1).max(128),
});
export type PosInvoiceRequest = z.infer<typeof PosInvoiceRequestSchema>;
export type PosInvoiceInput = Omit<PosInvoiceRequest, "id" | "idempotencyKey">;

/**
 * Field-visit invoice (POST /visits/{visitId}/field-invoice). Deducts the visit doctor's OWN field
 * inventory + uses contract-overridden pricing — a field-doctor (mobile) action. Shipped as a shared
 * wrapper for that surface; the web cashier UI does not issue these (W6 scope).
 */
export const FieldInvoiceRequestSchema = z.object({
  id: z.string().optional(),
  batchId: z.string().optional(),
  number: optionalText,
  discountAmount: z.number().min(0).default(0),
  items: z.array(InvoiceLineRequestSchema),
  payments: z.array(PaymentRequestSchema),
  idempotencyKey: z.string().min(1).max(128),
});
export type FieldInvoiceRequest = z.infer<typeof FieldInvoiceRequestSchema>;
export type FieldInvoiceInput = Omit<FieldInvoiceRequest, "id" | "idempotencyKey">;

/**
 * Standalone exam-fee / Kashfiyya invoice (POST /visits/{visitId}/exam-fee-invoice) — no line items,
 * no inventory; the whole invoice is the fee (System-B input for M9). Omit `amount` to fall back to
 * the visit's applied exam fee, then the system default. Shared wrapper; no web cashier UI (W6 scope).
 */
export const ExamFeeInvoiceRequestSchema = z.object({
  id: z.string().optional(),
  number: optionalText,
  amount: z.number().min(0).optional(),
  payments: z.array(PaymentRequestSchema),
  idempotencyKey: z.string().min(1).max(128),
});
export type ExamFeeInvoiceRequest = z.infer<typeof ExamFeeInvoiceRequestSchema>;
export type ExamFeeInvoiceInput = Omit<ExamFeeInvoiceRequest, "id" | "idempotencyKey">;
