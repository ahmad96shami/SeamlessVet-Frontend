import { z } from "zod";

/**
 * A row in the registration-request queue — mirrors `RegistrationRequestSummary`
 * (GET /admin/registration-requests). Returned by approve/reject too.
 */
export const RegistrationRequestSummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string(),
  phonePrimary: z.string(),
  email: z.string().nullish(),
  requestedRoleKey: z.string(),
  status: z.string(),
  createdAt: z.string(),
});
export type RegistrationRequestSummary = z.infer<typeof RegistrationRequestSummarySchema>;

/** POST .../approve body — optional reviewer notes. The requested role is applied as-is. */
export const ApproveRegistrationRequestSchema = z.object({
  notes: z.string().optional(),
});
export type ApproveRegistrationRequest = z.infer<typeof ApproveRegistrationRequestSchema>;

/** POST .../reject body — notes required (records the rejection reason). */
export const RejectRegistrationRequestSchema = z.object({
  notes: z.string().min(1),
});
export type RejectRegistrationRequest = z.infer<typeof RejectRegistrationRequestSchema>;
