import { useQuery } from "@tanstack/react-query";
import { listDoctors, type ApiError, type DoctorResponse } from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "doctors";

/** GET /doctors — active vet-role users for the visit / appointment / follow-up doctor pickers. */
export function useDoctors() {
  return useQuery<DoctorResponse[], ApiError>({
    queryKey: [KEY],
    queryFn: () => listDoctors(apiClient),
    staleTime: 5 * 60_000,
  });
}
