import type { AxiosInstance } from "axios";
import { z } from "zod";

import { DoctorResponseSchema, type DoctorResponse } from "../schemas/doctors";

const DoctorListSchema = z.array(DoctorResponseSchema);

/**
 * GET /doctors — the environment's active veterinarians (clinic / field / both) for the
 * visit + appointment doctor pickers. Authenticated-only; replaces the old field-inventories
 * source that hid clinic vets.
 */
export async function listDoctors(client: AxiosInstance): Promise<DoctorResponse[]> {
  const res = await client.get("/doctors");
  return DoctorListSchema.parse(res.data);
}
