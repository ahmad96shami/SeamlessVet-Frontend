import type { AxiosInstance } from "axios";
import { z } from "zod";

import {
  CloseAccountResponseSchema,
  DoctorEntitlementResponseSchema,
  type CloseAccountResponse,
  type DoctorEntitlementResponse,
  type EntitlementListParams,
} from "../schemas/entitlements";

const EntitlementListSchema = z.array(DoctorEntitlementResponseSchema);

// Entitlements are computed server-side and **read-only** (M30): a row accrues when a supervision batch
// is settled and is immediately credited to the responsible doctor's partner ledger — there is no
// approve/pay lifecycle and no settlement lock. Disbursement happens via doctor-partner payments. The
// close/reopen-account transitions stay here and carry the auto-injected `Idempotency-Key`.

/** GET /doctor-entitlements — offset-paged; filters doctorId. */
export async function listEntitlements(
  client: AxiosInstance,
  params?: EntitlementListParams,
): Promise<DoctorEntitlementResponse[]> {
  const res = await client.get("/doctor-entitlements", { params });
  return EntitlementListSchema.parse(res.data);
}

/** GET /doctor-entitlements/{id} — a single computed entitlement. */
export async function getEntitlement(
  client: AxiosInstance,
  id: string,
): Promise<DoctorEntitlementResponse> {
  const res = await client.get(`/doctor-entitlements/${id}`);
  return DoctorEntitlementResponseSchema.parse(res.data);
}

/**
 * POST /customers/{id}/close-account — close a customer's account (`contracts.activate`). **M30**
 * removed the settlement lock, so closing no longer requires a zero balance or releases entitlements
 * (those accrue on batch settle). Returns the closed ledger + the entitlements for its settled batches.
 */
export async function closeAccount(
  client: AxiosInstance,
  customerId: string,
): Promise<CloseAccountResponse> {
  const res = await client.post(`/customers/${customerId}/close-account`);
  return CloseAccountResponseSchema.parse(res.data);
}

/**
 * POST /customers/{id}/reopen-account — reopen a closed own ledger so a returning customer's new visit
 * can be billed (`contracts.activate`). Idempotent; returns the re-opened ledger (entitlements list
 * empty — reopening computes none).
 */
export async function reopenAccount(
  client: AxiosInstance,
  customerId: string,
): Promise<CloseAccountResponse> {
  const res = await client.post(`/customers/${customerId}/reopen-account`);
  return CloseAccountResponseSchema.parse(res.data);
}
