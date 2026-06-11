import { useMemo } from "react";

import { useDoctors } from "@/queries/doctors";

export interface DoctorOption {
  id: string;
  name: string;
}

/**
 * The doctor list for the visit / appointment / follow-up pickers and the calendar filter. Sourced
 * from `GET /doctors` — every active veterinarian (clinic / field / both) in the environment, so a
 * clinic vet can be assigned to an in-clinic visit (the field-inventories source it replaced only
 * ever surfaced field doctors). Isolated behind this one hook so the calling screens stay agnostic.
 */
export function useDoctorOptions(): {
  options: DoctorOption[];
  byId: Map<string, string>;
  isLoading: boolean;
} {
  const doctors = useDoctors();

  return useMemo(() => {
    const options: DoctorOption[] = (doctors.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
    }));
    const byId = new Map(options.map((o) => [o.id, o.name]));
    return { options, byId, isLoading: doctors.isLoading };
  }, [doctors.data, doctors.isLoading]);
}
