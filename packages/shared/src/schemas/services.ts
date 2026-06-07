import { z } from "zod";

import { optionalText } from "./common";

/**
 * M22 — services with this category form the **vaccine catalog**: managed from the web اللقاحات
 * tab, listed in their own POS tab, and linkable from `vaccinations.serviceId`.
 */
export const VACCINE_CATEGORY = "vaccination";

/**
 * M23 — the server-managed **system services** backing checkup-fee («رسوم الكشف») and night-stay
 * («مبيت») invoice lines (find-or-created per environment at issuance). Catalog UIs hide them from
 * the sellable services lists; their lines never need a client-supplied serviceId.
 */
export const CHECKUP_CATEGORY = "checkup";
export const NIGHT_STAY_CATEGORY = "night_stay";
export const SYSTEM_SERVICE_CATEGORIES: readonly string[] = [CHECKUP_CATEGORY, NIGHT_STAY_CATEGORY];

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
