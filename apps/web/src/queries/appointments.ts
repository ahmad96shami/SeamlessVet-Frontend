import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  attendAppointment,
  cancelAppointment,
  createAppointment,
  getAppointment,
  listAppointments,
  noShowAppointment,
  updateAppointment,
  type ApiError,
  type AppointmentCreateRequest,
  type AppointmentListParams,
  type AppointmentPatchRequest,
  type AppointmentResponse,
  type IdentifierResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "appointments";

export function useAppointments(params: AppointmentListParams) {
  return useQuery<AppointmentResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listAppointments(apiClient, params),
    placeholderData: (prev) => prev, // keep the calendar populated while navigating dates/filters
  });
}

export function useAppointment(id: string | null) {
  return useQuery<AppointmentResponse, ApiError>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getAppointment(apiClient, id as string),
    enabled: id !== null,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, AppointmentCreateRequest>({
    mutationFn: (body) => createAppointment(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: AppointmentPatchRequest }>({
    mutationFn: ({ id, body }) => updateAppointment(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** POST /appointments/{id}/attend — opens a clinic visit + back-links it. */
export function useAttendAppointment() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, string>({
    mutationFn: (id) => attendAppointment(apiClient, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["visits"] }); // a new visit was opened
    },
  });
}

/** POST /appointments/{id}/cancel — terminal transition. */
export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, string>({
    mutationFn: (id) => cancelAppointment(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** POST /appointments/{id}/no-show — terminal transition. */
export function useNoShowAppointment() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, string>({
    mutationFn: (id) => noShowAppointment(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
