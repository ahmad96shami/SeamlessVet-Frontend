import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  ContractCreateRequestSchema,
  ContractMedicationPriceCreateRequestSchema,
  ContractMedicationPricePatchRequestSchema,
  ContractMedicationPriceResponseSchema,
  ContractPatchRequestSchema,
  ContractResponseSchema,
  type ContractCreateRequest,
  type ContractListParams,
  type ContractMedicationPriceCreateRequest,
  type ContractMedicationPricePatchRequest,
  type ContractMedicationPriceResponse,
  type ContractPatchRequest,
  type ContractResponse,
} from "../schemas/contracts";

const ContractListSchema = z.array(ContractResponseSchema);
const MedicationPriceListSchema = z.array(ContractMedicationPriceResponseSchema);

// Mutations carry the `Idempotency-Key` header automatically (the host apiClient injects it on
// POST/PATCH/DELETE); the create wrappers mint the client GUID v7 `id` so screens never handle ids.
// Lifecycle transitions (activate/complete/cancel) are online-only — the web admin surface never
// queues them (activation is server-confirmed; the sync path refuses Draft→Active).

// ---- Contracts ------------------------------------------------------------

/** GET /contracts — offset-paged; filters customerId / responsibleDoctorId / status. */
export async function listContracts(
  client: AxiosInstance,
  params?: ContractListParams,
): Promise<ContractResponse[]> {
  const res = await client.get("/contracts", { params });
  return ContractListSchema.parse(res.data);
}

/** GET /contracts/{id} — a single contract. */
export async function getContract(client: AxiosInstance, id: string): Promise<ContractResponse> {
  const res = await client.get(`/contracts/${id}`);
  return ContractResponseSchema.parse(res.data);
}

/** POST /contracts — create (born `draft` unless an actor with `contracts.activate` sends `active`). */
export async function createContract(
  client: AxiosInstance,
  body: ContractCreateRequest,
): Promise<IdentifierResponse> {
  const payload = ContractCreateRequestSchema.parse(body);
  const res = await client.post("/contracts", { ...payload, id: newGuidV7() });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /contracts/{id} — edit terms (`id` lives in the URL; editable per the status gate). */
export async function updateContract(
  client: AxiosInstance,
  id: string,
  body: ContractPatchRequest,
): Promise<IdentifierResponse> {
  const payload = ContractPatchRequestSchema.parse(body);
  const res = await client.patch(`/contracts/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/**
 * POST /contracts/{id}/activate — the activation gate (Draft → Active). Permission-gated on
 * `contracts.activate` and **online-only** (server-confirmed; stamps activated_by/at). Once active,
 * contract pricing applies to the customer's field invoices.
 */
export async function activateContract(
  client: AxiosInstance,
  id: string,
): Promise<IdentifierResponse> {
  const res = await client.post(`/contracts/${id}/activate`);
  return IdentifierResponseSchema.parse(res.data);
}

/** POST /contracts/{id}/complete — Active → Completed (`contracts.activate`). */
export async function completeContract(
  client: AxiosInstance,
  id: string,
): Promise<IdentifierResponse> {
  const res = await client.post(`/contracts/${id}/complete`);
  return IdentifierResponseSchema.parse(res.data);
}

/** POST /contracts/{id}/cancel — Draft → Cancelled (`contracts.write`); active cancel is admin/accountant. */
export async function cancelContract(
  client: AxiosInstance,
  id: string,
): Promise<IdentifierResponse> {
  const res = await client.post(`/contracts/${id}/cancel`);
  return IdentifierResponseSchema.parse(res.data);
}

// ---- Contract medication prices (nested under a draft contract) -----------

/** GET /contracts/{contractId}/medication-prices — the per-medication overrides for a contract. */
export async function listContractMedicationPrices(
  client: AxiosInstance,
  contractId: string,
): Promise<ContractMedicationPriceResponse[]> {
  const res = await client.get(`/contracts/${contractId}/medication-prices`);
  return MedicationPriceListSchema.parse(res.data);
}

/** POST /contracts/{contractId}/medication-prices — add an override (parent must be `draft`). */
export async function createContractMedicationPrice(
  client: AxiosInstance,
  contractId: string,
  body: ContractMedicationPriceCreateRequest,
): Promise<IdentifierResponse> {
  const payload = ContractMedicationPriceCreateRequestSchema.parse(body);
  const res = await client.post(`/contracts/${contractId}/medication-prices`, {
    ...payload,
    id: newGuidV7(),
  });
  return IdentifierResponseSchema.parse(res.data);
}

/** PATCH /contracts/{contractId}/medication-prices/{priceId} — edit an override (parent must be `draft`). */
export async function updateContractMedicationPrice(
  client: AxiosInstance,
  contractId: string,
  priceId: string,
  body: ContractMedicationPricePatchRequest,
): Promise<IdentifierResponse> {
  const payload = ContractMedicationPricePatchRequestSchema.parse(body);
  const res = await client.patch(
    `/contracts/${contractId}/medication-prices/${priceId}`,
    payload,
  );
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /contracts/{contractId}/medication-prices/{priceId} — remove an override (parent must be `draft`). */
export async function deleteContractMedicationPrice(
  client: AxiosInstance,
  contractId: string,
  priceId: string,
): Promise<void> {
  await client.delete(`/contracts/${contractId}/medication-prices/${priceId}`);
}
