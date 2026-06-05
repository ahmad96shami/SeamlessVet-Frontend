import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { AppState } from "react-native";

import { useNotificationDeeplinks } from "@/hooks/useNotificationDeeplinks";
import { useNotificationsRealtime } from "@/hooks/useNotificationsRealtime";
import {
  configureNotificationHandler,
  ensurePushTokenRegistered,
  registerForPushNotificationsAsync,
} from "@/services/localNotifications";
import { syncVaccinationReminders } from "@/services/vaccinationReminders";
import { useAuthStore } from "@/stores/authStore";

/**
 * Headless host for app-wide side-effect hooks that must live *inside* the React-Query / PowerSync
 * providers (so they can call those hooks) yet persist across navigation. Mounted once by the root
 * layout. The Mo7 notifications stack (realtime feed, deeplink routing, local reminders) hangs here.
 */
export function AppServices(): null {
  const status = useAuthStore((s) => s.status);

  // Live SignalR feed (connect on auth, stop on logout) → feed invalidation + heads-up banner.
  useNotificationsRealtime();
  // Route a tapped notification (warm tap or cold start) to the right record.
  useNotificationDeeplinks();

  // Set the foreground presentation handler once, before any notification can arrive.
  useEffect(() => {
    configureNotificationHandler();
  }, []);

  // On sign-in: request permission + set up the channel + mint the Expo push token, then schedule
  // local vaccination reminders and register the token with the backend (Mo10 — remote push).
  useEffect(() => {
    if (status !== "authenticated") return;
    void registerForPushNotificationsAsync().then((granted) => {
      if (granted) void syncVaccinationReminders();
      void ensurePushTokenRegistered(); // no-op until a token was ever minted
    });
  }, [status]);

  // Token rotation (rare): the listener delivers the NATIVE token, so re-mint the Expo token and
  // re-register — only while signed in; an unauthenticated rotation is covered by the next sign-in.
  useEffect(() => {
    const sub = Notifications.addPushTokenListener(() => {
      if (useAuthStore.getState().status !== "authenticated") return;
      void registerForPushNotificationsAsync().then(() => ensurePushTokenRegistered());
    });
    return () => sub.remove();
  }, []);

  // Reschedule reminders on foreground — newly-synced vaccinations may have arrived while away.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && useAuthStore.getState().status === "authenticated") {
        void syncVaccinationReminders();
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}
