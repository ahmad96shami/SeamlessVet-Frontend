import { z } from "zod";

/**
 * A pickable veterinarian for the visit / appointment / follow-up doctor selectors
 * (GET /doctors). `role` is the role key (`vet_clinic` | `vet_field` | `vet_both`).
 */
export const DoctorResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
});
export type DoctorResponse = z.infer<typeof DoctorResponseSchema>;
