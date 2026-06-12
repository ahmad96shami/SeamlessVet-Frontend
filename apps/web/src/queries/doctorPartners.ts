import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDoctorPartner,
  deleteDoctorPartner,
  getDoctorPartner,
  getDoctorPartnerStatement,
  listDoctorPartnerPayments,
  listDoctorPartners,
  recordDoctorPartnerPayment,
  updateDoctorPartner,
  type ApiError,
  type DoctorPartnerCreateRequest,
  type DoctorPartnerListParams,
  type DoctorPartnerPatchRequest,
  type DoctorPartnerPaymentInput,
  type DoctorPartnerPaymentListParams,
  type DoctorPartnerPaymentResponse,
  type DoctorPartnerResponse,
  type DoctorPartnerStatementParams,
  type DoctorPartnerStatementResponse,
  type IdentifierResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "doctor-partners";
const STATEMENT = "doctor-partner-statement";
const PAYMENTS = "doctor-partner-payments";

export function useDoctorPartners(params: DoctorPartnerListParams) {
  return useQuery<DoctorPartnerResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listDoctorPartners(apiClient, params),
    placeholderData: (prev) => prev, // keep rows visible while paging/filtering
  });
}

export function useDoctorPartner(id: string | null) {
  return useQuery<DoctorPartnerResponse, ApiError>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getDoctorPartner(apiClient, id as string),
    enabled: id !== null,
  });
}

export function useDoctorPartnerStatement(id: string | null, params: DoctorPartnerStatementParams) {
  return useQuery<DoctorPartnerStatementResponse, ApiError>({
    queryKey: [STATEMENT, id, params],
    queryFn: () => getDoctorPartnerStatement(apiClient, id as string, params),
    enabled: id !== null,
    placeholderData: (prev) => prev,
  });
}

export function useCreateDoctorPartner() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, DoctorPartnerCreateRequest>({
    mutationFn: (body) => createDoctorPartner(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateDoctorPartner() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: DoctorPartnerPatchRequest }>({
    mutationFn: ({ id, body }) => updateDoctorPartner(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteDoctorPartner() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteDoctorPartner(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDoctorPartnerPayments(
  doctorPartnerId: string | null,
  params: DoctorPartnerPaymentListParams,
) {
  return useQuery<DoctorPartnerPaymentResponse[], ApiError>({
    queryKey: [PAYMENTS, doctorPartnerId, params],
    queryFn: () => listDoctorPartnerPayments(apiClient, doctorPartnerId as string, params),
    enabled: doctorPartnerId !== null,
    placeholderData: (prev) => prev,
  });
}

/** Record a payment to a doctor-partner — reduces the balance, so refresh the partner, statement & history. */
export function useRecordDoctorPartnerPayment(doctorPartnerId: string) {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, DoctorPartnerPaymentInput>({
    mutationFn: (input) => recordDoctorPartnerPayment(apiClient, doctorPartnerId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [STATEMENT, doctorPartnerId] });
      qc.invalidateQueries({ queryKey: [PAYMENTS, doctorPartnerId] });
    },
  });
}
