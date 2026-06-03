import type { Href } from "expo-router";
import { NotificationType } from "@vet/shared";

/**
 * Read a string field from a notification's loosely-typed (server `jsonb`) `payload` blob.
 * The server serializes the payload jsonb with **PascalCase** keys (e.g. `VisitId`, `CustomerId`) —
 * unlike the camelCase REST envelope — so match the key name case-insensitively (verified on-device:
 * the `negative_stock` payload arrived as `{VisitId, ProductId, …}`).
 */
function strField(payload: unknown, key: string): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const rec = payload as Record<string, unknown>;
  const target = key.toLowerCase();
  const match = Object.keys(rec).find((k) => k.toLowerCase() === target);
  const v = match ? rec[match] : undefined;
  return typeof v === "string" ? v : undefined;
}

/**
 * Mo7.4 — map a notification (`type` + the server `payload`) to the screen a field doctor should
 * land on when they tap it. Used both for a tapped OS notification (a local reminder, or a SignalR
 * push presented locally) and for a feed-row tap.
 *
 * Payload shapes are the backend's (camelCase): negative_stock → productId/visitId, vaccination_due
 * → visitId/customerId, account_ready_for_settlement → customerId, etc. Types with no field-doctor
 * destination on mobile (entitlement_approved, report_delivery, appointment_reminder,
 * registration_request) return null — the tap just opens the app, nothing to navigate to.
 */
export function notificationRoute(type: string, payload: unknown): Href | null {
  switch (type) {
    case NotificationType.NegativeStock:
    case NotificationType.LowStock:
    case NotificationType.ExpiryWarning:
      return "/inventory/alerts";

    case NotificationType.VaccinationDue: {
      const visitId = strField(payload, "visitId");
      if (visitId) return { pathname: "/visits/[id]", params: { id: visitId } };
      const customerId = strField(payload, "customerId");
      if (customerId) return { pathname: "/customers/[id]", params: { id: customerId } };
      return null;
    }

    case NotificationType.AccountReadyForSettlement: {
      const customerId = strField(payload, "customerId");
      return customerId ? { pathname: "/customers/[id]", params: { id: customerId } } : null;
    }

    case NotificationType.FollowUpDue: {
      const visitId = strField(payload, "visitId");
      return visitId ? { pathname: "/visits/[id]", params: { id: visitId } } : null;
    }

    // M18 medication-due (Mo9.5): the MedicationDueJob payload carries
    // {PrescriptionId, VisitId, ProductId, DoseNumber, DoseAt} — land on the visit, where
    // the prescription (and its reminder schedule) lives.
    case NotificationType.MedicationDue: {
      const visitId = strField(payload, "visitId");
      return visitId ? { pathname: "/visits/[id]", params: { id: visitId } } : null;
    }

    default:
      return null;
  }
}
