import type { AxiosInstance } from "axios";
import { z } from "zod";

import {
  CloseAccountResponseSchema,
  DoctorEntitlementResponseSchema,
  PayEntitlementRequestSchema,
  type CloseAccountResponse,
  type DoctorEntitlementResponse,
  type EntitlementListParams,
  type PayEntitlementRequest,
} from "../schemas/entitlements";

const EntitlementListSchema = z.array(DoctorEntitlementResponseSchema);

// Entitlements are computed server-side; clients only read them and drive the settlement transitions
// (approve / pay / close-account). All carry the auto-injected `Idempotency-Key`. These are payout
// authority + online-only — the settlement lock means approve/pay are rejected unless the customer's
// ledger is `closed` (409 `settlement_locked`).

/** GET /doctor-entitlements — offset-paged; filters doctorId / status. */
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
 * POST /doctor-entitlements/{id}/approve — mark an entitlement approved (`entitlements.approve`).
 * **Blocked unless the related customer's ledger is `closed`** (the settlement lock) → 409
 * `settlement_locked`. Returns the updated entitlement.
 */
export async function approveEntitlement(
  client: AxiosInstance,
  id: string,
): Promise<DoctorEntitlementResponse> {
  const res = await client.post(`/doctor-entitlements/${id}/approve`);
  return DoctorEntitlementResponseSchema.parse(res.data);
}

/**
 * POST /doctor-entitlements/{id}/pay — record disbursement of an approved entitlement
 * (`entitlements.approve`). Requires status `approved` first; records `paidAt` + `paidMethod`.
 */
export async function payEntitlement(
  client: AxiosInstance,
  id: string,
  body: PayEntitlementRequest,
): Promise<DoctorEntitlementResponse> {
  const payload = PayEntitlementRequestSchema.parse(body);
  const res = await client.post(`/doctor-entitlements/${id}/pay`, payload);
  return DoctorEntitlementResponseSchema.parse(res.data);
}

/**
 * POST /customers/{id}/close-account — close a customer's account (zero-balance only) and run the
 * entitlement settlement workflow (`entitlements.approve`). Rejected with 409 `settlement_locked`
 * unless `balance == 0`. Returns the closed ledger + the entitlements produced/refreshed.
 */
export async function closeAccount(
  client: AxiosInstance,
  customerId: string,
): Promise<CloseAccountResponse> {
  const res = await client.post(`/customers/${customerId}/close-account`);
  return CloseAccountResponseSchema.parse(res.data);
}

/**
 * POST /customers/{id}/reopen-account — lift the settlement lock on a closed own ledger so a
 * returning customer's new visit can be billed (`entitlements.approve`). Idempotent; returns the
 * re-opened ledger (entitlements list empty — re-opening computes none).
 */
export async function reopenAccount(
  client: AxiosInstance,
  customerId: string,
): Promise<CloseAccountResponse> {
  const res = await client.post(`/customers/${customerId}/reopen-account`);
  return CloseAccountResponseSchema.parse(res.data);
}
