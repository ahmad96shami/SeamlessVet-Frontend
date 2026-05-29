import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import i18n from "@/i18n";
import { prefs } from "@/services/mmkv";

/**
 * Mo7.1 — the **local** OS-notification foundation.
 *
 * Per the Mo7 "SignalR + local" decision, the device's *live* notification channel is SignalR
 * (foreground), exactly like web W10 — see `notificationsHub.ts`. This module owns the OS-level
 * surface that complements it:
 *   - the foreground presentation handler (so a SignalR push relayed via {@link presentLocalNotification}
 *     *and* a scheduled vaccination reminder both raise a heads-up banner),
 *   - the Android notification channel (heads-up importance),
 *   - the runtime permission flow — required for **any** local notification to display,
 *   - a **best-effort** Expo push-token grab, cached locally only.
 *
 * There is intentionally **no token registration with the backend**: vet-backend has no push-token
 * endpoint and no FCM/APNs/Expo server integration (its hub is in-process SignalR). True
 * background / killed-app remote push is therefore a deferred **backend** milestone; we still acquire
 * and cache the token so wiring it up later is a one-liner. Token acquisition is wrapped so a device
 * without push credentials (the current dev build) fails softly — local notifications keep working.
 */

const PUSH_TOKEN_KEY = "notifications.expoPushToken";
export const ANDROID_CHANNEL_ID = "default";

/**
 * Foreground presentation: show the banner + the notification-tray entry, no sound/badge — quiet,
 * matching the unobtrusive sync pill. Must be set before any notification can arrive.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Android needs an explicit channel for heads-up importance; iOS has no channels (no-op there). */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: i18n.t("notifications.title"),
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/** Ask for notification permission once (returns the granted state; never re-prompts after a hard deny). */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
}

/** The locally-cached Expo push token, if one was ever acquired (forward-compat; nothing consumes it yet). */
export function getCachedPushToken(): string | null {
  return prefs.getString(PUSH_TOKEN_KEY) ?? null;
}

/**
 * Set up local notifications on sign-in: permission + channel + a best-effort push-token grab.
 * Returns whether notifications may be shown — the caller uses this to decide whether scheduling
 * vaccination reminders (Mo7.4) is worthwhile.
 */
export async function registerForPushNotificationsAsync(): Promise<boolean> {
  await ensureAndroidChannel();
  const granted = await ensureNotificationPermission();
  if (!granted) return false;

  // Best-effort, forward-compat only: there is no backend to register with, and a dev build without
  // push credentials (or with no EAS projectId) will reject this. Cache whatever we get; never let
  // it break the permission flow or local scheduling.
  const projectId = easProjectId();
  if (Device.isDevice && projectId) {
    try {
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      prefs.set(PUSH_TOKEN_KEY, token.data);
      if (__DEV__) console.log("[push] expo token cached locally (backend registration deferred)");
    } catch (e) {
      if (__DEV__) {
        console.log("[push] expo token unavailable — remote push deferred to a backend milestone:", (e as Error).message);
      }
    }
  }
  return true;
}

/**
 * Present an immediate local notification. Used to surface an incoming SignalR push (Mo7.2) as a
 * heads-up banner — the mobile equivalent of web W10's toast — and to carry deeplink `data` so a tap
 * routes to the right record (Mo7.4). `trigger: null` fires it now.
 */
export async function presentLocalNotification(input: {
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
}): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body ?? undefined,
      data: input.data ?? {},
    },
    trigger: null,
  });
}
