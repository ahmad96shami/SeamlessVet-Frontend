import { z } from "zod";

import { optionalText } from "./common";

/** A services-catalog row (GET /admin/services[/{id}]). */
export const ServiceResponseSchema = z.object({
  id: z.string(),
  nameAr: z.string(),
  nameLatin: z.string().nullish(),
  category: z.string().nullish(),
  defaultPrice: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ServiceResponse = z.infer<typeof ServiceResponseSchema>;

/** Create/replace payload (POST /admin/services). `id` is a client-generated GUID v7. */
export const ServiceRequestSchema = z.object({
  id: z.string().optional(),
  nameAr: z.string().min(1),
  nameLatin: optionalText,
  category: optionalText,
  defaultPrice: z.number().min(0),
});
export type ServiceRequest = z.infer<typeof ServiceRequestSchema>;

export interface ServiceListParams {
  search?: string;
  category?: string;
  skip?: number;
  take?: number;
}
