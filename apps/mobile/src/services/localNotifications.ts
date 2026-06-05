import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerPushToken, unregisterPushToken } from "@vet/shared";

import i18n from "@/i18n";
import { apiClient } from "@/services/apiClient";
import { prefs } from "@/services/mmkv";

/**
 * Mo7.1 (+ Mo10) — the OS-notification foundation.
 *
 * Per the Mo7 "SignalR + local" decision, the device's *foreground* live channel is SignalR,
 * exactly like web W10 — see `notificationsHub.ts`. This module owns the OS-level surface that
 * complements it:
 *   - the foreground presentation handler (so a SignalR push relayed via {@link presentLocalNotification}
 *     *and* a scheduled vaccination reminder both raise a heads-up banner),
 *   - the Android notification channel (heads-up importance),
 *   - the runtime permission flow — required for **any** local notification to display,
 *   - the Expo push token: minted + cached on sign-in, **registered with the backend** (Mo10/M21
 *     `POST /devices/push-token`) so dispatched notifications also arrive as Expo remote pushes
 *     when the app is backgrounded or killed — and unregistered on logout.
 *
 * Backend registration is best-effort by design: a failure is swallowed (the next sign-in /
 * token rotation retries), and a dev build without push credentials / an EAS projectId simply
 * never mints a token — local notifications and SignalR keep working untouched.
 */

const PUSH_TOKEN_KEY = "notifications.expoPushToken";
export const ANDROID_CHANNEL_ID = "default";

/**
 * Mo10 dedup — a foregrounded device receives every notification TWICE: SignalR presents it as a
 * local banner (Mo7) and the Expo remote push also arrives. Both channels carry the same
 * `data.notificationId`, so a small insertion-ordered seen-set dedups symmetrically (whichever
 * channel lands first presents; the other is suppressed). Local reminders carry no
 * `notificationId` and never enter this path.
 */
const SEEN_NOTIFICATION_LIMIT = 50;
const seenNotificationIds = new Set<string>();

/** Record an id; returns false when it was already seen (the caller skips presenting). */
export function markNotificationSeen(id: string): boolean {
  if (seenNotificationIds.has(id)) return false;
  seenNotificationIds.add(id);
  if (seenNotificationIds.size > SEEN_NOTIFICATION_LIMIT) {
    // Sets iterate in insertion order — drop the oldest.
    const oldest = seenNotificationIds.values().next().value;
    if (oldest !== undefined) seenNotificationIds.delete(oldest);
  }
  return true;
}

/**
 * Foreground presentation: show the banner + the notification-tray entry, no sound/badge — quiet,
 * matching the unobtrusive sync pill. Must be set before any notification can arrive.
 *
 * Suppresses a REMOTE push whose id the SignalR path already presented (and vice-versa records
 * first-arrival so SignalR skips). The `trigger.type === "push"` guard is load-bearing: the
 * SignalR-presented local notification flows through this same handler with its id already in the
 * seen-set — without the guard it would suppress itself.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const trigger = notification.request.trigger;
      // Narrow via `in`: the trigger union includes input shapes without a `type` discriminator.
      const isRemote = trigger != null && "type" in trigger && trigger.type === "push";
      const id = notification.request.content.data?.notificationId;
      const suppress = isRemote && typeof id === "string" && !markNotificationSeen(id);
      return {
        shouldShowBanner: !suppress,
        shouldShowList: !suppress,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    },
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

/** The locally-cached Expo push token, if one was ever acquired (what Mo10 registers server-side). */
export function getCachedPushToken(): string | null {
  return prefs.getString(PUSH_TOKEN_KEY) ?? null;
}

/**
 * Set up local notifications on sign-in: permission + channel + a best-effort push-token mint.
 * Returns whether notifications may be shown — the caller uses this to decide whether scheduling
 * vaccination reminders (Mo7.4) is worthwhile, then follows up with
 * {@link ensurePushTokenRegistered}. Also the rotation path: `addPushTokenListener` delivers the
 * NATIVE (FCM) token, so a rotation re-runs this to mint a fresh Expo token wrapping it.
 */
export async function registerForPushNotificationsAsync(): Promise<boolean> {
  await ensureAndroidChannel();
  const granted = await ensureNotificationPermission();
  if (!granted) return false;

  // Best-effort: a dev build without push credentials (or with no EAS projectId) rejects this —
  // cache whatever we get; never let it break the permission flow or local scheduling.
  const projectId = easProjectId();
  if (Device.isDevice && projectId) {
    try {
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      prefs.set(PUSH_TOKEN_KEY, token.data);
    } catch (e) {
      if (__DEV__) {
        console.log("[push] expo token unavailable — remote push needs EAS/FCM credentials:", (e as Error).message);
      }
    }
  }
  return true;
}

/**
 * Mo10 — register the cached Expo token with the backend (`POST /devices/push-token`, upsert by
 * token) so remote pushes reach this device. Call while authenticated: after the sign-in mint and
 * on token rotation. No retry plumbing — a failure is benign (the next sign-in / rotation /
 * foreground re-registers) and the server reassigns a shared device to whoever signed in last.
 */
export async function ensurePushTokenRegistered(): Promise<void> {
  const token = getCachedPushToken();
  if (!token) return;
  try {
    await registerPushToken(apiClient, {
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
    });
  } catch (e) {
    if (__DEV__) console.log("[push] backend registration failed (will retry next sign-in):", (e as Error).message);
  }
}

/**
 * Mo10 — drop this device's token server-side (logout). Must run while the session is still
 * authenticated (the call needs the bearer) and must never block logout: errors are swallowed —
 * worst case the token lingers until Expo reports it dead or the next owner re-registers it.
 * The local cache is kept: the token still identifies this physical device for the next sign-in.
 */
export async function unregisterPushTokenBestEffort(): Promise<void> {
  const token = getCachedPushToken();
  if (!token) return;
  try {
    await unregisterPushToken(apiClient, { token });
  } catch {
    /* best-effort — logout is local-first */
  }
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
