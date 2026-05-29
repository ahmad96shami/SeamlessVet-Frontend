import * as Notifications from "expo-notifications";
import { formatDate, NotificationType } from "@vet/shared";

import i18n from "@/i18n";
import { ANDROID_CHANNEL_ID } from "@/services/localNotifications";
import { powerSync } from "@/sync/database";

const REMINDER_PREFIX = "vacc-";
const LOOKAHEAD_DAYS = 60;
const REMINDER_HOUR_LOCAL = 9;
// iOS allows at most 64 *pending* local notifications; stay safely under that.
const MAX_REMINDERS = 60;

interface DueVaccinationRow {
  id: string;
  vaccine_type: string | null;
  next_due_date: string | null;
  visit_id: string | null;
  customer_id: string | null;
}

/** A local-time Date for a `YYYY-MM-DD` due date at the reminder hour; null if unparseable. */
function reminderDate(ymd: string): Date | null {
  const [y, m, d] = ymd.split("-").map((p) => Number(p));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, REMINDER_HOUR_LOCAL, 0, 0, 0);
}

/**
 * Mo7.4 — schedule a **local** OS reminder for each upcoming vaccination in this doctor's synced
 * scope, read straight from the local SQLite PowerSync maintains (so it works fully offline — the
 * server's `vaccination_due` SignalR push only reaches a connected, foregrounded device). Reminders
 * are keyed by vaccination id, so re-running this *replaces* rather than duplicates, and reminders
 * for vaccinations that are no longer upcoming (given, deleted, or now past) are cancelled. Capped
 * at {@link MAX_REMINDERS} to respect iOS's 64-pending-notification limit.
 *
 * A reminder carries the same `{ type, payload }` a server push would, so the deeplink router
 * ({@link file://../lib/notificationRoute.ts}) lands the doctor on the visit / customer record. A
 * vaccination may therefore surface both a local reminder *and* — if the device is online +
 * foregrounded when the daily job runs — a server push; that overlap is intentional, the local one
 * being the offline guarantee.
 */
export async function syncVaccinationReminders(): Promise<void> {
  try {
    const rows = await powerSync.getAll<DueVaccinationRow>(
      `SELECT id, vaccine_type, next_due_date, visit_id, customer_id
         FROM vaccinations
        WHERE next_due_date IS NOT NULL
          AND next_due_date >= date('now')
          AND next_due_date <= date('now', ?)
        ORDER BY next_due_date
        LIMIT ?`,
      [`+${LOOKAHEAD_DAYS} days`, MAX_REMINDERS],
    );

    const lang = i18n.resolvedLanguage;
    const now = Date.now();
    const desired = new Map<string, { row: DueVaccinationRow; when: Date }>();
    for (const row of rows) {
      if (!row.next_due_date) continue;
      const when = reminderDate(row.next_due_date);
      if (!when || when.getTime() <= now) continue; // skip already-past (incl. due today after the hour)
      desired.set(REMINDER_PREFIX + row.id, { row, when });
    }

    // Cancel our reminders that are no longer wanted.
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((s) => s.identifier.startsWith(REMINDER_PREFIX) && !desired.has(s.identifier))
        .map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)),
    );

    // (Re)schedule — passing the stable identifier replaces any existing reminder for that id.
    await Promise.all(
      [...desired].map(([identifier, { row, when }]) =>
        Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: i18n.t("notifications.reminder.vaccinationTitle"),
            body: i18n.t("notifications.reminder.vaccinationBody", {
              vaccine: row.vaccine_type ?? i18n.t("notifications.type.vaccination_due"),
              date: row.next_due_date ? formatDate(row.next_due_date, lang) : "",
            }),
            data: {
              type: NotificationType.VaccinationDue,
              payload: { vaccinationId: row.id, visitId: row.visit_id, customerId: row.customer_id },
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: when,
            channelId: ANDROID_CHANNEL_ID,
          },
        }),
      ),
    );
  } catch (e) {
    if (__DEV__) console.log("[reminders] vaccination reminder scheduling skipped:", (e as Error).message);
  }
}
