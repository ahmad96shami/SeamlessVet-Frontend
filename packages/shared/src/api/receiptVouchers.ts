import type { AxiosInstance } from "axios";
import { z } from "zod";

import { idempotencyKey, newGuidV7 } from "../http/idempotency";
import { sendRequest, type RequestDescriptor } from "../offline/queue";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  ReceiptVoucherRequestSchema,
  ReceiptVoucherResponseSchema,
  type ReceiptVoucherInput,
  type ReceiptVoucherListParams,
  type ReceiptVoucherResponse,
} from "../schemas/receiptVouchers";

const ReceiptVoucherListSchema = z.array(ReceiptVoucherResponseSchema);

/** GET /receipt-vouchers — newest-first, offset-paged; filter by customerId. */
export async function listReceiptVouchers(
  client: AxiosInstance,
  params?: ReceiptVoucherListParams,
): Promise<ReceiptVoucherResponse[]> {
  const res = await client.get("/receipt-vouchers", { params });
  return ReceiptVoucherListSchema.parse(res.data);
}

/** GET /receipt-vouchers/{id}. */
export async function getReceiptVoucher(
  client: AxiosInstance,
  id: string,
): Promise<ReceiptVoucherResponse> {
  const res = await client.get(`/receipt-vouchers/${id}`);
  return ReceiptVoucherResponseSchema.parse(res.data);
}

/**
 * Build the `POST /receipt-vouchers` request — mints the voucher GUID v7 `id` + a stable
 * idempotency key (body + header). Used by mobile Mo4.4 over the REST-intent queue so an
 * offline-issued voucher applies at most once on reconnect.
 */
export function buildReceiptVoucherRequest(input: ReceiptVoucherInput): RequestDescriptor {
  const key = idempotencyKey();
  const id = newGuidV7();
  const body = ReceiptVoucherRequestSchema.parse({ ...input, id, idempotencyKey: key });
  return {
    method: "POST",
    url: "/receipt-vouchers",
    body,
    idempotencyKey: key,
    label: "sync.label.receiptVoucher",
    entityKind: "receiptVoucher",
    entityId: id,
  };
}

/**
 * POST /receipt-vouchers — record a payment received (Sanad Qabd); posts a `receipt_voucher` ledger
 * credit reducing the customer's balance. Mints the `id` + idempotency key (body + header).
 */
export async function issueReceiptVoucher(
  client: AxiosInstance,
  input: ReceiptVoucherInput,
): Promise<IdentifierResponse> {
  const data = await sendRequest(client, buildReceiptVoucherRequest(input));
  return IdentifierResponseSchema.parse(data);
}
