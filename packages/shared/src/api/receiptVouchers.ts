import type { AxiosInstance } from "axios";
import { z } from "zod";

import { IDEMPOTENCY_HEADER } from "../constants";
import { idempotencyKey, newGuidV7 } from "../http/idempotency";
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
 * POST /receipt-vouchers — record a payment received (Sanad Qabd); posts a `receipt_voucher` ledger
 * credit reducing the customer's balance. Mints the `id` + idempotency key (body + header).
 */
export async function issueReceiptVoucher(
  client: AxiosInstance,
  input: ReceiptVoucherInput,
): Promise<IdentifierResponse> {
  const key = idempotencyKey();
  const payload = ReceiptVoucherRequestSchema.parse({ ...input, id: newGuidV7(), idempotencyKey: key });
  const res = await client.post("/receipt-vouchers", payload, {
    headers: { [IDEMPOTENCY_HEADER]: key },
  });
  return IdentifierResponseSchema.parse(res.data);
}
